// ============================================================
// Negative Keyword Decision Engine
// Detects wasteful queries and generates negative KW suggestions
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import type { RiskLevel } from "../query-scorer/index.js";

export interface NegKwInput {
  query: string;
  spend: number;
  conversions: number;
  clicks: number;
  intent?: string;
  score?: number;
}

export interface NegKwSuggestion {
  query: string;
  suggestedText: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  confidence: number; // 0-1
  risk: RiskLevel;
  reason: string;
  wasteEstimate: number; // estimated wasted spend ₪
  source: "rule" | "ai" | "combined";
}

// ============================================================
// Rule-based patterns (fast, zero AI cost)
// ============================================================
const WASTEFUL_PATTERNS: Array<{
  pattern: RegExp;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  reason: string;
  risk: RiskLevel;
}> = [
  { pattern: /\bfree\b/i, matchType: "BROAD", reason: "Free-seeking queries rarely convert", risk: "high" },
  { pattern: /\bused\b/i, matchType: "PHRASE", reason: "Looking for used items", risk: "high" },
  { pattern: /\bsecond.?hand\b/i, matchType: "PHRASE", reason: "Second-hand seeker", risk: "high" },
  { pattern: /\brefurbished\b/i, matchType: "PHRASE", reason: "Refurbished product seeker", risk: "medium" },
  { pattern: /\b(repair|fix|broken|not working|doesn't work)\b/i, matchType: "PHRASE", reason: "Seeking repairs, not buying", risk: "high" },
  { pattern: /\b(how to|how do i|how can i)\b/i, matchType: "PHRASE", reason: "Informational how-to query", risk: "medium" },
  { pattern: /\b(tutorial|guide|step by step|instructions|manual)\b/i, matchType: "PHRASE", reason: "Looking for instructions, not to buy", risk: "medium" },
  { pattern: /\b(diy|do it yourself)\b/i, matchType: "PHRASE", reason: "DIY seeker, not buyer", risk: "high" },
  { pattern: /\b(jobs|career|vacancy|hiring|employment|work at)\b/i, matchType: "PHRASE", reason: "Job seeker", risk: "critical" },
  { pattern: /\b(parts|spare parts|replacement parts|components)\b/i, matchType: "PHRASE", reason: "Parts seeker, not product buyer", risk: "medium" },
  { pattern: /\b(wikipedia|wiki|definition|what is|meaning of)\b/i, matchType: "PHRASE", reason: "Informational lookup", risk: "high" },
  { pattern: /\b(rent|lease|rental)\b/i, matchType: "PHRASE", reason: "Looking to rent, not buy", risk: "high" },
  { pattern: /\b(review|reviews|rating|ratings|feedback)\b/i, matchType: "BROAD", reason: "Research phase, not buying intent", risk: "low" },
  { pattern: /\b(sample|samples|trial|try before|demo)\b/i, matchType: "PHRASE", reason: "Sample seeker", risk: "medium" },
  { pattern: /\b(cheap|cheapest|budget|low cost|affordable)\b/i, matchType: "BROAD", reason: "Price-sensitive, low-value buyer", risk: "low" },
  { pattern: /\b(coupon|discount code|promo code|voucher)\b/i, matchType: "PHRASE", reason: "Coupon seeker", risk: "medium" },
  { pattern: /\bwholesale\b/i, matchType: "PHRASE", reason: "Wholesale buyer, not retail", risk: "medium" },
];

export class NegativeKeywordEngine {
  private client: Anthropic;
  private model: string;

  constructor() {
    const config = getConfig();
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    this.model = config.AI_MODEL;
  }

  // Rule-based analysis (no AI cost)
  analyzeWithRules(inputs: NegKwInput[]): NegKwSuggestion[] {
    const suggestions: NegKwSuggestion[] = [];

    for (const input of inputs) {
      for (const rule of WASTEFUL_PATTERNS) {
        if (rule.pattern.test(input.query)) {
          const matchedWord = input.query.match(rule.pattern)?.[0] || input.query;
          suggestions.push({
            query: input.query,
            suggestedText: matchedWord.toLowerCase(),
            matchType: rule.matchType,
            confidence: 0.85,
            risk: rule.risk,
            reason: rule.reason,
            wasteEstimate: input.spend,
            source: "rule",
          });
          break; // one suggestion per query from rules
        }
      }
    }

    return suggestions;
  }

  // AI-enhanced analysis for queries that passed rule filter
  async analyzeWithAI(inputs: NegKwInput[], context?: string): Promise<NegKwSuggestion[]> {
    if (inputs.length === 0) return [];

    const PROMPT = `You are an expert Google Ads negative keyword strategist for an e-commerce store.

Analyze these search queries and identify which ones are wasting ad budget.
For each wasteful query, suggest the best negative keyword.

Context: ${context || "E-commerce store selling products online"}

Rules:
- Only suggest negatives for queries that are CLEARLY wasteful
- If a query might convert, don't suggest negative
- Match type: EXACT for very specific waste, PHRASE for pattern waste, BROAD only if entire concept is irrelevant
- confidence: 0.0-1.0 (only suggest if > 0.6)

Return a JSON array. Include ONLY queries that should get negative keywords.

Format:
[
  {
    "query": "original query",
    "suggestedText": "negative keyword text",
    "matchType": "EXACT|PHRASE|BROAD",
    "confidence": 0.85,
    "risk": "low|medium|high|critical",
    "reason": "Why this wastes budget",
    "wasteEstimate": 25.50
  }
]

Queries to analyze:
${inputs.map((i, n) => `${n + 1}. "${i.query}" | spend: ₪${i.spend.toFixed(2)} | conversions: ${i.conversions} | clicks: ${i.clicks}`).join("\n")}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: "user", content: PROMPT }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as NegKwSuggestion[];
      return parsed.map((s) => ({ ...s, source: "ai" as const }));
    } catch (err) {
      logger.error({ err }, "Negative keyword AI analysis failed");
      return [];
    }
  }

  // Combined analysis: rules first, then AI for remaining
  async analyze(inputs: NegKwInput[], context?: string): Promise<NegKwSuggestion[]> {
    const ruleSuggestions = this.analyzeWithRules(inputs);
    const ruleQuerySet = new Set(ruleSuggestions.map((s) => s.query));

    // Only send to AI queries not already caught by rules
    const remainingInputs = inputs.filter((i) => !ruleQuerySet.has(i.query));
    const aiSuggestions = await this.analyzeWithAI(remainingInputs, context);

    return [
      ...ruleSuggestions,
      ...aiSuggestions,
    ].sort((a, b) => b.wasteEstimate - a.wasteEstimate);
  }

  // Deduplicate suggestions against existing negatives
  static deduplicate(
    suggestions: NegKwSuggestion[],
    existing: string[]
  ): NegKwSuggestion[] {
    const existingSet = new Set(existing.map((k) => k.toLowerCase()));
    return suggestions.filter((s) => !existingSet.has(s.suggestedText.toLowerCase()));
  }
}
