// ============================================================
// Budget Pacing Engine
// Analyzes spend pacing and recommends budget adjustments
// ============================================================

export interface PacingWindow {
  days: 1 | 3 | 7 | 14 | 30;
  spend: number;
  budget: number;
  conversions: number;
  revenue: number;
  profit: number;
}

export interface CampaignPacingInput {
  campaignId: string;
  campaignName: string;
  dailyBudgetMicros: number; // in micros
  windows: PacingWindow[];
  hourlySpend?: { hour: number; spend: number }[]; // last 24h
  timezone?: string;
}

export type PacingStatus =
  | "on_pace"
  | "underspending"
  | "overspending"
  | "budget_exhausted"
  | "inconsistent";

export interface BudgetAdjustment {
  campaignId: string;
  campaignName: string;
  currentDailyBudget: number;
  suggestedDailyBudget: number;
  changePercent: number;
  changeAmount: number;
  pacingStatus: PacingStatus;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  reasons: string[];
  dataWindows: {
    days: number;
    avgDailySpend: number;
    pacingRate: number;
    roas: number;
    profit: number;
  }[];
}

const MAX_INCREASE_PERCENT = 50;  // max 50% increase at once
const MAX_DECREASE_PERCENT = 30;  // max 30% decrease at once
const OVERSPEND_THRESHOLD = 1.1;  // 10% over budget = overspending
const UNDERSPEND_THRESHOLD = 0.7; // 70% utilization = underspending

export class BudgetPacingEngine {
  analyze(inputs: CampaignPacingInput[]): BudgetAdjustment[] {
    return inputs.map((c) => this.analyzeCampaign(c));
  }

  private analyzeCampaign(c: CampaignPacingInput): BudgetAdjustment {
    const currentDailyBudget = c.dailyBudgetMicros / 1_000_000;
    const reasons: string[] = [];
    const windowAnalysis = [];

    // Analyze each time window
    for (const w of c.windows) {
      const avgDailySpend = w.spend / w.days;
      const pacingRate = currentDailyBudget > 0 ? avgDailySpend / currentDailyBudget : 0;
      const roas = w.spend > 0 ? w.revenue / w.spend : 0;

      windowAnalysis.push({
        days: w.days,
        avgDailySpend,
        pacingRate,
        roas,
        profit: w.profit,
      });
    }

    // Primary signal: 7-day window (most reliable)
    const primary = windowAnalysis.find((w) => w.days === 7) || windowAnalysis[0];
    const short = windowAnalysis.find((w) => w.days === 1);
    const long = windowAnalysis.find((w) => w.days === 30);

    const { pacingStatus, pacingRate } = this.getPacingStatus(primary, short);

    // Determine recommended budget adjustment
    let adjustmentFactor = 1.0;
    let confidence = 0.7;
    let riskLevel: "low" | "medium" | "high" = "low";

    // Profitable and underspending → increase
    if (pacingStatus === "underspending" && primary.profit > 0) {
      const headroom = currentDailyBudget - primary.avgDailySpend;
      adjustmentFactor = Math.min(1 + MAX_INCREASE_PERCENT / 100, 1 / pacingRate);
      reasons.push(`Underspending by ${((1 - pacingRate) * 100).toFixed(0)}% — profitable campaign has room to grow`);
      confidence = 0.75;
      riskLevel = "low";
    }
    // Overspending → decrease
    else if (pacingStatus === "overspending") {
      adjustmentFactor = Math.max(1 - MAX_DECREASE_PERCENT / 100, 0.9);
      reasons.push(`Overspending by ${((pacingRate - 1) * 100).toFixed(0)}% vs daily budget`);
      riskLevel = "medium";
      confidence = 0.85;
    }
    // Unprofitable → reduce
    else if (primary.profit < 0 && primary.avgDailySpend > 50) {
      adjustmentFactor = 0.8;
      reasons.push(`Campaign running at a loss (profit: -₪${Math.abs(primary.profit).toFixed(0)} over ${primary.days} days)`);
      riskLevel = "high";
      confidence = 0.9;
    }
    // Good ROAS on short window, underspending → increase aggressively
    else if (short && short.roas > 4 && pacingStatus === "underspending") {
      adjustmentFactor = Math.min(1.3, 1 / pacingRate);
      reasons.push(`Strong 1-day ROAS of ${short.roas.toFixed(1)}x with budget headroom`);
      confidence = 0.65;
      riskLevel = "low";
    }
    // Consistent and on-track
    else {
      reasons.push("Campaign is pacing well within budget");
    }

    // Consistency check between windows
    if (windowAnalysis.length >= 3) {
      const rates = windowAnalysis.map((w) => w.pacingRate);
      const maxRate = Math.max(...rates);
      const minRate = Math.min(...rates);
      if (maxRate / Math.max(minRate, 0.01) > 2) {
        pacingStatus === "inconsistent";
        reasons.push("High variance in spend across time windows — be cautious");
        riskLevel = "medium";
        confidence *= 0.8;
      }
    }

    const suggestedDailyBudget = Math.max(
      currentDailyBudget * (1 - MAX_DECREASE_PERCENT / 100),
      Math.min(currentDailyBudget * (1 + MAX_INCREASE_PERCENT / 100), currentDailyBudget * adjustmentFactor)
    );

    const changeAmount = suggestedDailyBudget - currentDailyBudget;
    const changePercent = (changeAmount / currentDailyBudget) * 100;

    return {
      campaignId: c.campaignId,
      campaignName: c.campaignName,
      currentDailyBudget: Math.round(currentDailyBudget * 100) / 100,
      suggestedDailyBudget: Math.round(suggestedDailyBudget * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
      changeAmount: Math.round(changeAmount * 100) / 100,
      pacingStatus,
      riskLevel,
      confidence: Math.round(confidence * 100) / 100,
      reasons,
      dataWindows: windowAnalysis.map((w) => ({
        ...w,
        avgDailySpend: Math.round(w.avgDailySpend * 100) / 100,
        pacingRate: Math.round(w.pacingRate * 1000) / 1000,
        roas: Math.round(w.roas * 100) / 100,
        profit: Math.round(w.profit * 100) / 100,
      })),
    };
  }

  private getPacingStatus(
    primary: { avgDailySpend: number; pacingRate: number },
    short?: { avgDailySpend: number; pacingRate: number }
  ): { pacingStatus: PacingStatus; pacingRate: number } {
    const pacingRate = primary.pacingRate;

    if (pacingRate > OVERSPEND_THRESHOLD) return { pacingStatus: "overspending", pacingRate };
    if (pacingRate < 0.05) return { pacingStatus: "budget_exhausted", pacingRate };
    if (pacingRate < UNDERSPEND_THRESHOLD) return { pacingStatus: "underspending", pacingRate };

    // Check short-term vs long-term divergence
    if (short && Math.abs(short.pacingRate - pacingRate) > 0.3) {
      return { pacingStatus: "inconsistent", pacingRate };
    }

    return { pacingStatus: "on_pace", pacingRate };
  }

  // Detect overspend risk for today based on hourly data
  detectTodayOverspend(
    campaignId: string,
    hourlySpend: { hour: number; spend: number }[],
    dailyBudget: number
  ): { risk: boolean; projectedSpend: number; remainingBudget: number } {
    const now = new Date();
    const currentHour = now.getHours();
    const spentSoFar = hourlySpend
      .filter((h) => h.hour <= currentHour)
      .reduce((sum, h) => sum + h.spend, 0);

    const hoursElapsed = Math.max(1, currentHour);
    const projectedSpend = (spentSoFar / hoursElapsed) * 24;
    const remainingBudget = dailyBudget - spentSoFar;

    return {
      risk: projectedSpend > dailyBudget * 1.15,
      projectedSpend: Math.round(projectedSpend * 100) / 100,
      remainingBudget: Math.round(remainingBudget * 100) / 100,
    };
  }
}
