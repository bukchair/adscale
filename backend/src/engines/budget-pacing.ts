/**
 * Budget Pacing Engine
 * Detects overspend/underspend and recommends budget adjustments.
 * Uses rolling windows: 1d, 3d, 7d, 14d, 30d.
 */
import { prisma } from "../db/client.js";
import type { Campaign } from "@prisma/client";

export type Window = "1d" | "3d" | "7d" | "14d" | "30d";

export interface PacingResult {
  campaignId:         string;
  campaignName:       string;
  currentBudget:      number;
  recommendedBudget:  number;
  changePercent:      number;
  direction:          "increase" | "decrease" | "maintain";
  reason:             string;
  urgency:            "low" | "medium" | "high";
  windowData:         Record<Window, WindowMetrics>;
}

interface WindowMetrics {
  avgDailySpend: number;
  avgDailyRoas:  number;
  trend:         number;     // % change vs prior period
}

export async function analyzePacing(
  campaignId: string
): Promise<PacingResult> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });

  const now   = new Date();
  const today = new Date(now.toDateString());

  const windowData = {} as Record<Window, WindowMetrics>;
  const windows: Array<[Window, number]> = [
    ["1d", 1], ["3d", 3], ["7d", 7], ["14d", 14], ["30d", 30],
  ];

  for (const [label, days] of windows) {
    const from = new Date(today);
    from.setDate(from.getDate() - days);

    const rows = await prisma.dailyMetric.findMany({
      where: { campaignId, date: { gte: from, lt: today } },
    });

    const n        = rows.length || 1;
    const totalSpend   = rows.reduce((s, r) => s + Number(r.cost), 0);
    const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);

    const halfPoint = Math.floor(n / 2);
    const firstHalf  = rows.slice(0, halfPoint);
    const secondHalf = rows.slice(halfPoint);
    const avgFirst   = firstHalf.reduce((s, r) => s + Number(r.cost), 0) / (firstHalf.length || 1);
    const avgSecond  = secondHalf.reduce((s, r) => s + Number(r.cost), 0) / (secondHalf.length || 1);
    const trend      = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

    windowData[label] = {
      avgDailySpend: totalSpend / n,
      avgDailyRoas:  totalSpend > 0 ? totalRevenue / totalSpend : 0,
      trend,
    };
  }

  const budget = Number(campaign.budgetAmount);
  const w7     = windowData["7d"];
  const w3     = windowData["3d"];

  // Utilization: how much of the budget is actually being spent
  const utilization = budget > 0 ? w3.avgDailySpend / budget : 1;

  let recommended  = budget;
  let direction: PacingResult["direction"] = "maintain";
  let reason       = "Budget utilization is healthy.";
  let urgency: PacingResult["urgency"] = "low";

  // Overspend: spending more than budget allows
  if (utilization >= 0.98 && w7.avgDailyRoas >= 2.5) {
    // High ROAS + hitting budget limit — increase
    recommended = budget * 1.20;
    direction   = "increase";
    reason      = `Hitting budget limit daily (${(utilization * 100).toFixed(0)}% utilized) with strong ROAS ${w7.avgDailyRoas.toFixed(2)}x — increase to capture more volume.`;
    urgency     = "high";
  } else if (utilization < 0.6 && w7.avgDailySpend > 0) {
    // Underspend — lower budget or investigate
    recommended = w7.avgDailySpend * 1.15;
    direction   = "decrease";
    reason      = `Only spending ${(utilization * 100).toFixed(0)}% of budget. Reducing to reflect actual pacing.`;
    urgency     = "medium";
  } else if (w7.avgDailyRoas < 1.0 && w7.avgDailySpend > 50) {
    // Losing money — reduce
    recommended = budget * 0.70;
    direction   = "decrease";
    reason      = `ROAS ${w7.avgDailyRoas.toFixed(2)}x is below breakeven. Reducing budget to limit loss.`;
    urgency     = "high";
  } else if (w3.trend > 20 && w7.avgDailyRoas >= 3.0) {
    // Spend growing + strong ROAS — scale up
    recommended = budget * 1.15;
    direction   = "increase";
    reason      = `Spend trending up ${w3.trend.toFixed(0)}% with ROAS ${w7.avgDailyRoas.toFixed(2)}x — safe to scale.`;
    urgency     = "medium";
  }

  const changePercent = budget > 0 ? ((recommended - budget) / budget) * 100 : 0;

  return {
    campaignId,
    campaignName:      campaign.name,
    currentBudget:     round2(budget),
    recommendedBudget: round2(recommended),
    changePercent:     round2(changePercent),
    direction,
    reason,
    urgency,
    windowData,
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
