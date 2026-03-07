/**
 * Query Scoring Engine
 * Scores search term queries 0-100 based on performance signals + AI intent.
 * Higher score = more valuable. Lower score = candidate for negative.
 */
import type { SearchTerm } from "@prisma/client";

export interface QueryScore {
  termId:     string;
  query:      string;
  score:      number;        // 0-100
  riskLevel:  "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown:  ScoreBreakdown;
  action:     "keep" | "monitor" | "add_negative" | "pause";
}

interface ScoreBreakdown {
  conversionScore: number;   // 0-40 (heaviest weight)
  roasScore:       number;   // 0-25
  ctrScore:        number;   // 0-15
  cpaScore:        number;   // 0-15
  intentBonus:     number;   // 0-5 (from AI intent)
}

export function scoreQuery(
  term: SearchTerm,
  avgCpa: number,            // account/campaign average CPA
  avgRoas: number,           // account/campaign average ROAS
  avgCtr: number             // account/campaign average CTR
): QueryScore {
  const breakdown: ScoreBreakdown = {
    conversionScore: scoreConversions(term.conversions, term.clicks),
    roasScore:       scoreRoas(term.roas ?? 0, avgRoas),
    ctrScore:        scoreCtr(term.ctr ?? 0, avgCtr),
    cpaScore:        scoreCpa(Number(term.cpa ?? 0), avgCpa),
    intentBonus:     intentToBonus(term.intent as string),
  };

  const raw =
    breakdown.conversionScore +
    breakdown.roasScore +
    breakdown.ctrScore +
    breakdown.cpaScore +
    breakdown.intentBonus;

  const score = Math.min(100, Math.max(0, Math.round(raw)));

  return {
    termId:    term.id,
    query:     term.query,
    score,
    riskLevel: toRiskLevel(score),
    breakdown,
    action:    toAction(score, term.intent as string),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring sub-functions
// ─────────────────────────────────────────────────────────────────────────────

function scoreConversions(conversions: number, clicks: number): number {
  if (clicks === 0) return 0;
  const cvr = conversions / clicks;
  if (conversions >= 5)  return 40;
  if (conversions >= 2)  return 30;
  if (conversions >= 1)  return 20;
  if (cvr > 0.01)        return 10;
  return 0;
}

function scoreRoas(roas: number, avg: number): number {
  if (avg === 0) return 12;
  const ratio = roas / avg;
  if (ratio >= 2.0) return 25;
  if (ratio >= 1.5) return 20;
  if (ratio >= 1.0) return 15;
  if (ratio >= 0.5) return 8;
  return 0;
}

function scoreCtr(ctr: number, avg: number): number {
  if (avg === 0) return 7;
  const ratio = ctr / avg;
  if (ratio >= 2.0) return 15;
  if (ratio >= 1.5) return 12;
  if (ratio >= 1.0) return 9;
  if (ratio >= 0.5) return 5;
  return 0;
}

function scoreCpa(cpa: number, avg: number): number {
  if (cpa === 0 || avg === 0) return 7;
  const ratio = cpa / avg;
  if (ratio <= 0.5) return 15;
  if (ratio <= 0.8) return 12;
  if (ratio <= 1.0) return 9;
  if (ratio <= 1.5) return 5;
  return 0;
}

function intentToBonus(intent: string): number {
  const map: Record<string, number> = {
    buyer:       5,
    research:    3,
    low_intent:  1,
    competitor:  0,
    support:     0,
    irrelevant: -5,
  };
  return map[intent] ?? 0;
}

function toRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 60) return "LOW";
  if (score >= 35) return "MEDIUM";
  if (score >= 15) return "HIGH";
  return "CRITICAL";
}

function toAction(score: number, intent: string): QueryScore["action"] {
  if (intent === "irrelevant") return "add_negative";
  if (score >= 60) return "keep";
  if (score >= 35) return "monitor";
  if (score >= 15) return "add_negative";
  return "add_negative";
}

// Batch score all terms
export function scoreTerms(
  terms: SearchTerm[],
  avgCpa: number,
  avgRoas: number,
  avgCtr: number
): QueryScore[] {
  return terms.map((t) => scoreQuery(t, avgCpa, avgRoas, avgCtr));
}
