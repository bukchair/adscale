// ============================================================
// Optimization Decision Engine
// Combines all engine signals into actionable recommendations
// ============================================================

import type { CampaignProfitResult } from "../profit/index.js";
import type { BudgetAdjustment } from "../budget-pacing/index.js";
import type { NegKwSuggestion } from "../negative-keyword/index.js";
import type { QueryScore } from "../query-scorer/index.js";

export type ActionType =
  | "RAISE_BUDGET"
  | "LOWER_BUDGET"
  | "PAUSE_CAMPAIGN"
  | "ENABLE_CAMPAIGN"
  | "PAUSE_KEYWORD"
  | "ENABLE_KEYWORD"
  | "ADD_NEGATIVE_KEYWORD"
  | "SUGGEST_CREATIVE"
  | "PROMOTE_PRODUCT"
  | "FLAG_ISSUE"
  | "ADJUST_BID"
  | "CHANGE_TARGETING";

export type Severity = "low" | "medium" | "high" | "critical";
export type ExecutionMode = "DRY_RUN" | "SUGGESTION" | "APPROVAL_REQUIRED" | "AUTOMATED";

export interface OptimizationDecision {
  id: string;
  campaignId?: string;
  campaignName?: string;
  type: ActionType;
  title: string;
  reason: string;
  confidence: number;
  severity: Severity;
  expectedImpact: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
  canAutoExecute: boolean;
  tags: string[];
  createdAt: string;
}

export interface OptimizationContext {
  campaignId: string;
  campaignName: string;
  profit?: CampaignProfitResult;
  pacing?: BudgetAdjustment;
  negKwSuggestions?: NegKwSuggestion[];
  queryScores?: QueryScore[];
  impressionShare?: number;
  qualityScore?: number;
  daysSinceCreativeRefresh?: number;
}

export class OptimizationEngine {
  private executionMode: ExecutionMode;

  constructor(executionMode: ExecutionMode = "SUGGESTION") {
    this.executionMode = executionMode;
  }

  generateDecisions(contexts: OptimizationContext[]): OptimizationDecision[] {
    const decisions: OptimizationDecision[] = [];

    for (const ctx of contexts) {
      decisions.push(...this.analyzeContext(ctx));
    }

    // Sort by severity + confidence
    return decisions.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const sDiff = severityOrder[b.severity] - severityOrder[a.severity];
      return sDiff !== 0 ? sDiff : b.confidence - a.confidence;
    });
  }

  private analyzeContext(ctx: OptimizationContext): OptimizationDecision[] {
    const decisions: OptimizationDecision[] = [];

    // === PROFIT-BASED DECISIONS ===
    if (ctx.profit) {
      const p = ctx.profit;

      if (p.isUnprofitable && p.adSpend > 500) {
        decisions.push(this.makeDecision({
          campaignId: ctx.campaignId,
          campaignName: ctx.campaignName,
          type: "PAUSE_CAMPAIGN",
          title: `Pause unprofitable campaign: ${ctx.campaignName}`,
          reason: `Campaign has lost ₪${Math.abs(p.netProfit).toFixed(0)} with ₪${p.adSpend.toFixed(0)} spend. POAS: ${p.poas.toFixed(2)}`,
          confidence: 0.9,
          severity: "critical",
          expectedImpact: `Stop ₪${(p.adSpend / 7).toFixed(0)}/day loss immediately`,
          payload: { campaignId: ctx.campaignId, action: "pause" },
        }));
      } else if (p.poas > 1.5 && !p.isUnprofitable) {
        decisions.push(this.makeDecision({
          campaignId: ctx.campaignId,
          campaignName: ctx.campaignName,
          type: "RAISE_BUDGET",
          title: `Scale high-profit campaign: ${ctx.campaignName}`,
          reason: `POAS ${p.poas.toFixed(2)}x — every ₪1 of ad spend returns ₪${p.poas.toFixed(2)} in profit`,
          confidence: 0.8,
          severity: "low",
          expectedImpact: `Estimated +₪${(p.profitPerConversion * 2).toFixed(0)}/week additional profit`,
          payload: { campaignId: ctx.campaignId, increasePercent: 20 },
        }));
      }
    }

    // === BUDGET PACING DECISIONS ===
    if (ctx.pacing) {
      const pa = ctx.pacing;

      if (pa.pacingStatus === "overspending" && pa.changePercent < -10) {
        decisions.push(this.makeDecision({
          campaignId: ctx.campaignId,
          campaignName: ctx.campaignName,
          type: "LOWER_BUDGET",
          title: `Reduce overspending budget: ${ctx.campaignName}`,
          reason: `Pacing ${((pa.currentDailyBudget > 0 ? pa.dataWindows[0]?.pacingRate || 1 : 1) * 100).toFixed(0)}% of daily budget. Suggested: ₪${pa.suggestedDailyBudget}/day`,
          confidence: pa.confidence,
          severity: "medium",
          expectedImpact: `Save ₪${Math.abs(pa.changeAmount).toFixed(0)}/day`,
          payload: {
            campaignId: ctx.campaignId,
            currentBudget: pa.currentDailyBudget,
            suggestedBudget: pa.suggestedDailyBudget,
          },
        }));
      } else if (pa.pacingStatus === "underspending" && pa.changePercent > 10) {
        decisions.push(this.makeDecision({
          campaignId: ctx.campaignId,
          campaignName: ctx.campaignName,
          type: "RAISE_BUDGET",
          title: `Increase constrained budget: ${ctx.campaignName}`,
          reason: `Only ${((pa.dataWindows[0]?.pacingRate || 0) * 100).toFixed(0)}% budget utilization — campaign is budget-limited`,
          confidence: pa.confidence,
          severity: "medium",
          expectedImpact: `+₪${pa.changeAmount.toFixed(0)}/day potential revenue capture`,
          payload: {
            campaignId: ctx.campaignId,
            currentBudget: pa.currentDailyBudget,
            suggestedBudget: pa.suggestedDailyBudget,
          },
        }));
      }
    }

    // === NEGATIVE KEYWORD DECISIONS ===
    if (ctx.negKwSuggestions?.length) {
      const critical = ctx.negKwSuggestions.filter((s) => s.risk === "critical" || s.risk === "high");
      const totalWaste = ctx.negKwSuggestions.reduce((sum, s) => sum + s.wasteEstimate, 0);

      if (critical.length > 0) {
        decisions.push(this.makeDecision({
          campaignId: ctx.campaignId,
          campaignName: ctx.campaignName,
          type: "ADD_NEGATIVE_KEYWORD",
          title: `Add ${critical.length} negative keyword(s): ${ctx.campaignName}`,
          reason: `${critical.length} wasteful queries detected. Estimated waste: ₪${totalWaste.toFixed(0)}`,
          confidence: Math.max(...critical.map((s) => s.confidence)),
          severity: critical.some((s) => s.risk === "critical") ? "critical" : "high",
          expectedImpact: `Save up to ₪${totalWaste.toFixed(0)} in wasted ad spend`,
          payload: {
            campaignId: ctx.campaignId,
            suggestions: critical.map((s) => ({
              text: s.suggestedText,
              matchType: s.matchType,
              confidence: s.confidence,
            })),
          },
        }));
      }
    }

    // === QUERY SCORE DECISIONS ===
    if (ctx.queryScores?.length) {
      const criticalQueries = ctx.queryScores.filter((q) => q.riskLevel === "critical");
      if (criticalQueries.length > 3) {
        decisions.push(this.makeDecision({
          campaignId: ctx.campaignId,
          campaignName: ctx.campaignName,
          type: "FLAG_ISSUE",
          title: `${criticalQueries.length} critical wasteful queries: ${ctx.campaignName}`,
          reason: `Multiple queries with 0 conversions and significant spend detected`,
          confidence: 0.85,
          severity: "high",
          expectedImpact: "Review and block high-waste search terms",
          payload: { campaignId: ctx.campaignId, queries: criticalQueries.map((q) => q.query).slice(0, 10) },
        }));
      }
    }

    // === CREATIVE FATIGUE ===
    if (ctx.daysSinceCreativeRefresh && ctx.daysSinceCreativeRefresh > 90) {
      decisions.push(this.makeDecision({
        campaignId: ctx.campaignId,
        campaignName: ctx.campaignName,
        type: "SUGGEST_CREATIVE",
        title: `Creative refresh needed: ${ctx.campaignName}`,
        reason: `Ads haven't been refreshed in ${ctx.daysSinceCreativeRefresh} days — creative fatigue risk`,
        confidence: 0.75,
        severity: "medium",
        expectedImpact: "Fresh creative can improve CTR by 15-30%",
        payload: { campaignId: ctx.campaignId, daysSinceRefresh: ctx.daysSinceCreativeRefresh },
      }));
    }

    return decisions;
  }

  private makeDecision(params: Omit<OptimizationDecision, "id" | "requiresApproval" | "canAutoExecute" | "tags" | "createdAt">): OptimizationDecision {
    const requiresApproval = this.requiresApproval(params.severity, params.confidence);
    const canAutoExecute = this.canAutoExecute(params.type, params.severity);

    return {
      ...params,
      id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      requiresApproval,
      canAutoExecute,
      tags: [params.type.toLowerCase(), params.severity],
      createdAt: new Date().toISOString(),
    };
  }

  private requiresApproval(severity: Severity, confidence: number): boolean {
    if (this.executionMode === "DRY_RUN") return false;
    if (this.executionMode === "SUGGESTION") return false;
    if (this.executionMode === "APPROVAL_REQUIRED") return true;
    // AUTOMATED mode: auto-approve low risk + high confidence
    return severity !== "low" || confidence < 0.8;
  }

  private canAutoExecute(type: ActionType, severity: Severity): boolean {
    if (this.executionMode !== "AUTOMATED") return false;
    // Never auto-execute these
    const manualOnly: ActionType[] = ["PAUSE_CAMPAIGN", "CHANGE_TARGETING"];
    if (manualOnly.includes(type)) return false;
    return severity === "low";
  }
}
