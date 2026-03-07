/**
 * Negative Keyword Engine
 * Rule-based detection + AI validation.
 * Detects wasteful patterns and generates suggestions with confidence scores.
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger/index.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface NegSuggestion {
  query:       string;
  suggestion:  string;          // normalized negative keyword
  matchType:   "EXACT" | "PHRASE" | "BROAD";
  confidence:  number;          // 0-1
  riskLevel:   "LOW" | "MEDIUM" | "HIGH";
  reason:      string;
  wasteAmount: number;          // estimated wasted spend
}

// Wasteful pattern groups
const WASTE_PATTERNS: Array<{ pattern: RegExp; reason: string; confidence: number }> = [
  { pattern: /\b(free|gratis|חינם)\b/i,                          reason: "Freebie seeker",         confidence: 0.95 },
  { pattern: /\b(used|second.?hand|refurbished|משומש)\b/i,       reason: "Used product seeker",    confidence: 0.92 },
  { pattern: /\b(repair|fix|broken|תיקון)\b/i,                   reason: "Repair/support intent",  confidence: 0.90 },
  { pattern: /\b(how\s+to|tutorial|guide|מדריך|איך)\b/i,         reason: "Educational intent",     confidence: 0.88 },
  { pattern: /\b(manual|instructions|הוראות)\b/i,                reason: "Manual/instructions",    confidence: 0.87 },
  { pattern: /\b(jobs?\b|career|hiring|vacancy|משרה)\b/i,        reason: "Job seeker",             confidence: 0.98 },
  { pattern: /\b(parts?|spare|accessories|חלקים)\b/i,            reason: "Parts/accessories",      confidence: 0.80 },
  { pattern: /\b(diy|do.?it.?yourself)\b/i,                      reason: "DIY intent",             confidence: 0.90 },
  { pattern: /\b(wholesale|bulk|סיטוני)\b/i,                     reason: "Wholesale seeker",       confidence: 0.75 },
  { pattern: /\b(rent|rental|lease|השכרה)\b/i,                   reason: "Rental intent",          confidence: 0.85 },
  { pattern: /\b(download|torrent|crack|keygen)\b/i,             reason: "Piracy intent",          confidence: 0.98 },
  { pattern: /\b(wiki|wikipedia|forum|reddit|blog)\b/i,          reason: "Research/informational", confidence: 0.82 },
];

export function detectWastePatterns(
  query: string,
  cost: number
): NegSuggestion | null {
  const q = query.toLowerCase().trim();

  for (const { pattern, reason, confidence } of WASTE_PATTERNS) {
    if (pattern.test(q)) {
      // Extract the matched token as the negative keyword
      const match = q.match(pattern);
      const suggestion = match ? match[0].trim() : q;

      return {
        query,
        suggestion:  suggestion.replace(/\s+/g, " "),
        matchType:   confidence >= 0.90 ? "EXACT" : "PHRASE",
        confidence,
        riskLevel:   confidence >= 0.90 ? "HIGH" : "MEDIUM",
        reason,
        wasteAmount: cost,
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI-powered batch analysis for edge cases
// ─────────────────────────────────────────────────────────────────────────────

const AI_PROMPT = (queries: Array<{ query: string; cost: number; conversions: number }>) => `
You are an expert Google Ads negative keyword specialist.

Analyze these search queries that have ZERO conversions and significant spend.
Identify which should be added as negative keywords to prevent waste.

For each query return:
- should_negative: true/false
- suggestion: the exact string to add as negative keyword (normalized, lowercase)
- match_type: "EXACT" | "PHRASE" | "BROAD"
- confidence: 0.0-1.0
- reason: brief explanation

Return ONLY valid JSON array, no commentary:
[
  {
    "query": "...",
    "should_negative": true,
    "suggestion": "...",
    "match_type": "EXACT",
    "confidence": 0.85,
    "reason": "..."
  }
]

Queries (query | spend | conversions):
${queries.map((q) => `"${q.query}" | ₪${q.cost.toFixed(2)} | ${q.conversions} conv`).join("\n")}
`.trim();

export interface WasteQuery {
  query:       string;
  cost:        number;
  conversions: number;
}

export async function aiAnalyzeWaste(
  queries: WasteQuery[]
): Promise<NegSuggestion[]> {
  if (!queries.length) return [];

  const results: NegSuggestion[] = [];
  const BATCH = 30;

  for (let i = 0; i < queries.length; i += BATCH) {
    const batch = queries.slice(i, i + BATCH);
    try {
      const response = await client.messages.create({
        model:      "claude-opus-4-6",
        max_tokens: 2048,
        messages:   [{ role: "user", content: AI_PROMPT(batch) }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const parsed = JSON.parse(text) as any[];

      for (const item of parsed) {
        if (!item.should_negative) continue;
        const orig = batch.find((q) => q.query === item.query);
        results.push({
          query:       item.query,
          suggestion:  item.suggestion,
          matchType:   item.match_type ?? "PHRASE",
          confidence:  item.confidence ?? 0.7,
          riskLevel:   item.confidence >= 0.85 ? "HIGH" : item.confidence >= 0.6 ? "MEDIUM" : "LOW",
          reason:      item.reason,
          wasteAmount: orig?.cost ?? 0,
        });
      }
    } catch (err) {
      logger.error({ err }, "AI negative keyword analysis failed");
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined pipeline: rule-based first, AI for edge cases
// ─────────────────────────────────────────────────────────────────────────────

export interface TermForAnalysis {
  query:       string;
  cost:        number;
  conversions: number;
  clicks:      number;
}

export async function analyzeTerms(
  terms: TermForAnalysis[]
): Promise<NegSuggestion[]> {
  const results: NegSuggestion[] = [];
  const uncaught: WasteQuery[]   = [];

  for (const t of terms) {
    const rule = detectWastePatterns(t.query, t.cost);
    if (rule) {
      results.push(rule);
    } else if (t.cost > 5 && t.conversions === 0) {
      // Only send to AI if has meaningful spend and no conversions
      uncaught.push({ query: t.query, cost: t.cost, conversions: t.conversions });
    }
  }

  if (uncaught.length) {
    const aiResults = await aiAnalyzeWaste(uncaught);
    results.push(...aiResults);
  }

  // Deduplicate by suggestion
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.suggestion}:${r.matchType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
