// ============================================================
// Query Scoring Engine
// Scores search queries 0-100 based on multi-signal analysis
// ============================================================

import type { SearchIntent } from "../intent-classifier/index.js";

export interface QueryMetrics {
  query: string;
  impressions: number;
  clicks: number;
  costMicros: bigint | number;
  conversions: number;
  conversionValue: number;
  intent?: SearchIntent;
  intentConfidence?: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface QueryScore {
  query: string;
  score: number; // 0-100 (higher = more valuable, keep)
  riskLevel: RiskLevel;
  recommendedAction: "keep" | "monitor" | "add_negative" | "block";
  signals: {
    ctr: number;
    conversionRate: number;
    cpc: number;
    cpa: number;
    intentScore: number;
    historicalScore: number;
  };
  reasons: string[];
}

// Weights for composite score
const WEIGHTS = {
  conversionRate: 0.35,
  ctr: 0.20,
  cpcEfficiency: 0.15,
  intentScore: 0.20,
  volumeBonus: 0.10,
};

// Intent base scores (0-100)
const INTENT_SCORES: Record<SearchIntent, number> = {
  buyer: 90,
  research: 50,
  competitor: 30,
  support: 10,
  irrelevant: 0,
  low_intent: 25,
};

export class QueryScorer {
  score(metrics: QueryMetrics[]): QueryScore[] {
    if (metrics.length === 0) return [];

    // Calculate benchmark averages for normalization
    const avgCvr = this.avg(metrics.map((m) => this.cvr(m)));
    const avgCtr = this.avg(metrics.map((m) => this.ctr(m)));
    const avgCpc = this.avg(metrics.map((m) => this.cpc(m)));

    return metrics.map((m) => this.scoreQuery(m, { avgCvr, avgCtr, avgCpc }));
  }

  private scoreQuery(
    m: QueryMetrics,
    benchmarks: { avgCvr: number; avgCtr: number; avgCpc: number }
  ): QueryScore {
    const cvr = this.cvr(m);
    const ctr = this.ctr(m);
    const cpc = this.cpc(m);
    const cpa = m.conversions > 0 ? this.cpc(m) * m.clicks / m.conversions : 999;

    // Normalize signals (0-1)
    const cvrNorm = benchmarks.avgCvr > 0 ? Math.min(1, cvr / (benchmarks.avgCvr * 2)) : (cvr > 0 ? 0.5 : 0);
    const ctrNorm = benchmarks.avgCtr > 0 ? Math.min(1, ctr / (benchmarks.avgCtr * 2)) : 0;
    const cpcEffNorm = benchmarks.avgCpc > 0 ? Math.min(1, benchmarks.avgCpc / Math.max(cpc, 0.01)) : 0.5;

    // Intent score
    const intentBase = m.intent ? INTENT_SCORES[m.intent] : 50;
    const intentNorm = intentBase / 100;
    const intentConfBonus = m.intentConfidence ? (m.intentConfidence - 0.5) * 0.2 : 0;
    const intentScore = Math.max(0, Math.min(1, intentNorm + intentConfBonus));

    // Volume bonus: reward queries that have been seen enough times
    const volumeBonus = Math.min(1, Math.log10(Math.max(1, m.clicks)) / 3);

    const rawScore =
      WEIGHTS.conversionRate * cvrNorm * 100 +
      WEIGHTS.ctr * ctrNorm * 100 +
      WEIGHTS.cpcEfficiency * cpcEffNorm * 100 +
      WEIGHTS.intentScore * intentScore * 100 +
      WEIGHTS.volumeBonus * volumeBonus * 100;

    const score = Math.round(Math.max(0, Math.min(100, rawScore)));

    // Determine risk level and action
    const { riskLevel, recommendedAction, reasons } = this.classifyRisk(score, m, cvr, cpa);

    return {
      query: m.query,
      score,
      riskLevel,
      recommendedAction,
      signals: {
        ctr: Math.round(ctr * 10000) / 100, // as %
        conversionRate: Math.round(cvr * 10000) / 100,
        cpc: Math.round(cpc * 100) / 100,
        cpa: cpa < 999 ? Math.round(cpa * 100) / 100 : 0,
        intentScore: intentBase,
        historicalScore: Math.round(cvrNorm * 100),
      },
      reasons,
    };
  }

  private classifyRisk(
    score: number,
    m: QueryMetrics,
    cvr: number,
    cpa: number
  ): { riskLevel: RiskLevel; recommendedAction: QueryScore["recommendedAction"]; reasons: string[] } {
    const reasons: string[] = [];

    // Score-based initial classification
    let riskLevel: RiskLevel;
    let recommendedAction: QueryScore["recommendedAction"];

    if (score >= 60) {
      riskLevel = "low";
      recommendedAction = "keep";
    } else if (score >= 40) {
      riskLevel = "medium";
      recommendedAction = "monitor";
    } else if (score >= 20) {
      riskLevel = "high";
      recommendedAction = "add_negative";
    } else {
      riskLevel = "critical";
      recommendedAction = "block";
    }

    // Override rules
    const spend = Number(m.costMicros) / 1_000_000;

    if (spend > 50 && cvr === 0 && m.clicks >= 10) {
      riskLevel = "critical";
      recommendedAction = "block";
      reasons.push(`₪${spend.toFixed(0)} spent with zero conversions (${m.clicks} clicks)`);
    }

    if (m.intent === "irrelevant") {
      riskLevel = "critical";
      recommendedAction = "block";
      reasons.push("Classified as irrelevant to product/service");
    }

    if (m.intent === "support" || m.intent === "low_intent") {
      if (riskLevel !== "critical") riskLevel = "high";
      if (recommendedAction === "keep") recommendedAction = "monitor";
      reasons.push(`Intent: ${m.intent} — low purchase probability`);
    }

    if (cvr > 0.05) reasons.push(`Strong CVR: ${(cvr * 100).toFixed(1)}%`);
    if (cvr === 0 && m.clicks > 5) reasons.push("No conversions despite clicks");
    if (m.intent === "buyer") reasons.push("High buyer intent detected");

    return { riskLevel, recommendedAction, reasons };
  }

  private cvr(m: QueryMetrics): number {
    return m.clicks > 0 ? m.conversions / m.clicks : 0;
  }

  private ctr(m: QueryMetrics): number {
    return m.impressions > 0 ? m.clicks / m.impressions : 0;
  }

  private cpc(m: QueryMetrics): number {
    return m.clicks > 0 ? Number(m.costMicros) / 1_000_000 / m.clicks : 0;
  }

  private avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
