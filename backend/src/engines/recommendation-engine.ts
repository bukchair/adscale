/**
 * Recommendation Engine
 * Aggregates signals from all engines and produces ranked recommendations.
 * Each recommendation carries type, severity, expected impact, and payload.
 */
import { prisma } from "../db/client.js";
import { analyzePacing } from "./budget-pacing.js";
import { calcCampaignProfit } from "./profit-engine.js";
import { scoreTerms } from "./query-scorer.js";
import { analyzeTerms } from "./negative-keyword.js";
import { logger } from "../logger/index.js";
import type { RecommendationType, Severity } from "@prisma/client";

export interface Recommendation {
  type:           RecommendationType;
  title:          string;
  reason:         string;
  confidence:     number;
  severity:       Severity;
  expectedImpact: string;
  payload:        Record<string, unknown>;
  campaignId?:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads a deduplication set of (type, campaignId) pairs for recommendations
 * that are still PENDING/IN_REVIEW to prevent spamming the same suggestion.
 */
async function loadExistingRecs(orgId: string): Promise<Set<string>> {
  const existing = await prisma.aiRecommendation.findMany({
    where: {
      status:   { in: ["PENDING", "IN_REVIEW"] },
      campaign: { adAccount: { orgId } },
    },
    select: { type: true, campaignId: true },
  });
  return new Set(existing.map((r) => `${r.type}:${r.campaignId ?? ""}`));
}

export async function generateRecommendations(
  orgId: string,
  dateFrom: Date,
  dateTo:   Date
): Promise<Recommendation[]> {
  const recs: Recommendation[] = [];

  // Load existing pending recs to avoid duplicates
  const existingRecs = await loadExistingRecs(orgId);
  const hasPending = (type: string, campaignId?: string) =>
    existingRecs.has(`${type}:${campaignId ?? ""}`);

  const accounts = await prisma.adAccount.findMany({
    where:   { orgId, isActive: true },
    include: { campaigns: { where: { status: "ACTIVE" } } },
  });

  for (const account of accounts) {
    for (const campaign of account.campaigns) {
      try {
        // 1. Budget pacing
        const pacing = await analyzePacing(campaign.id);
        if (pacing.direction !== "maintain") {
          const recType = pacing.direction === "increase" ? "RAISE_BUDGET" : "LOWER_BUDGET";
          if (!hasPending(recType, campaign.id)) recs.push({
            type:           recType,
            title:          `${pacing.direction === "increase" ? "Increase" : "Decrease"} budget for "${campaign.name}"`,
            reason:         pacing.reason,
            confidence:     pacing.urgency === "high" ? 0.90 : 0.70,
            severity:       pacing.urgency === "high" ? "HIGH" : "MEDIUM",
            expectedImpact: `Budget: ₪${pacing.currentBudget} → ₪${pacing.recommendedBudget} (${pacing.changePercent > 0 ? "+" : ""}${pacing.changePercent.toFixed(0)}%)`,
            payload:        { campaignId: campaign.id, currentBudget: pacing.currentBudget, recommendedBudget: pacing.recommendedBudget },
            campaignId:     campaign.id,
          });
        }

        // 2. Profitability
        const profit = await calcCampaignProfit(campaign.id, dateFrom, dateTo);
        if (profit.netProfit < 0 && profit.adSpend > 100 && !hasPending("PAUSE_CAMPAIGN", campaign.id)) {
          recs.push({
            type:           "PAUSE_CAMPAIGN",
            title:          `"${campaign.name}" is unprofitable`,
            reason:         `Net profit: ₪${profit.netProfit.toFixed(0)} on ₪${profit.adSpend.toFixed(0)} spend. ROAS: ${profit.roas.toFixed(2)}x`,
            confidence:     0.85,
            severity:       "HIGH",
            expectedImpact: `Stop loss of ₪${Math.abs(profit.netProfit).toFixed(0)}/period`,
            payload:        { campaignId: campaign.id, ...profit },
            campaignId:     campaign.id,
          });
        }

        // 2b. Scale-up opportunity: high ROAS, profitable, but budget-constrained
        if (
          profit.roas >= 4.0 &&
          profit.netProfit > 0 &&
          pacing.direction === "increase" &&
          !hasPending("RAISE_BUDGET", campaign.id)
        ) {
          recs.push({
            type:           "RAISE_BUDGET",
            title:          `Scale "${campaign.name}" — ${profit.roas.toFixed(1)}x ROAS`,
            reason:         `Campaign is profitable (₪${profit.netProfit.toFixed(0)} net) with ${profit.roas.toFixed(1)}x ROAS and hitting budget cap daily.`,
            confidence:     0.92,
            severity:       "HIGH",
            expectedImpact: `+${((pacing.recommendedBudget - pacing.currentBudget) * profit.roas).toFixed(0)}₪ est. additional revenue`,
            payload:        {
              campaignId:        campaign.id,
              currentBudget:     pacing.currentBudget,
              recommendedBudget: pacing.recommendedBudget,
              currentRoas:       profit.roas,
            },
            campaignId: campaign.id,
          });
        }

        // 3. Search term negative keywords
        const terms = await prisma.searchTerm.findMany({
          where:   { campaignId: campaign.id, dateFrom: { gte: dateFrom } },
          take:    500,
          orderBy: { cost: "desc" },
        });

        if (terms.length > 0) {
          const negSuggestions = await analyzeTerms(
            terms.map((t) => ({
              query:       t.query,
              cost:        Number(t.cost),
              conversions: t.conversions,
              clicks:      t.clicks,
            })),
            campaign.id   // pass campaignId for DB dedup
          );

          const highConf = negSuggestions.filter((s) => s.confidence >= 0.80);
          if (highConf.length > 0 && !hasPending("ADD_NEGATIVE_KEYWORD", campaign.id)) {
            const totalWaste = highConf.reduce((s, n) => s + n.wasteAmount, 0);
            recs.push({
              type:           "ADD_NEGATIVE_KEYWORD",
              title:          `Add ${highConf.length} negative keywords to "${campaign.name}"`,
              reason:         `Found ${highConf.length} wasteful queries spending ₪${totalWaste.toFixed(0)} with 0 conversions.`,
              confidence:     0.88,
              severity:       totalWaste > 200 ? "HIGH" : "MEDIUM",
              expectedImpact: `Save ≈₪${totalWaste.toFixed(0)} in wasted spend`,
              payload:        { campaignId: campaign.id, suggestions: highConf.slice(0, 20) },
              campaignId:     campaign.id,
            });
          }

          // Low-score queries → flag
          const avg = {
            cpa:  terms.reduce((s, t) => s + Number(t.cpa ?? 0), 0) / terms.length,
            roas: terms.reduce((s, t) => s + (t.roas ?? 0), 0)       / terms.length,
            ctr:  terms.reduce((s, t) => s + (t.ctr ?? 0), 0)        / terms.length,
          };
          const scored   = scoreTerms(terms as any, avg.cpa, avg.roas, avg.ctr);
          const critical = scored.filter((s) => s.score < 15 && s.riskLevel === "CRITICAL");

          if (critical.length > 5 && !hasPending("FLAG_ISSUE", campaign.id)) {
            recs.push({
              type:           "FLAG_ISSUE",
              title:          `${critical.length} critically underperforming queries in "${campaign.name}"`,
              reason:         `These queries score < 15/100 and have zero conversions despite significant impressions.`,
              confidence:     0.80,
              severity:       "MEDIUM",
              expectedImpact: "Improved campaign quality score and reduced wasted impressions",
              payload:        { campaignId: campaign.id, queries: critical.slice(0, 10).map((s) => s.query) },
              campaignId:     campaign.id,
            });
          }
        }
      } catch (err) {
        logger.error({ err, campaignId: campaign.id }, "Error generating recommendations for campaign");
      }
    }
  }

  // Deduplicate and sort by severity
  const severityOrder: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  recs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return recs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persist recommendations to DB
// ─────────────────────────────────────────────────────────────────────────────

export async function persistRecommendations(
  recs: Recommendation[]
): Promise<void> {
  for (const rec of recs) {
    await prisma.aiRecommendation.create({
      data: {
        type:           rec.type,
        title:          rec.title,
        reason:         rec.reason,
        confidence:     rec.confidence,
        severity:       rec.severity,
        expectedImpact: rec.expectedImpact,
        payload:        rec.payload as any,
        campaignId:     rec.campaignId ?? null,
      },
    });
  }
}
