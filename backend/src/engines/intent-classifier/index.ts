// ============================================================
// Search Intent Classification Engine
// Uses Claude AI to classify search query intent
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

export type SearchIntent =
  | "buyer"
  | "research"
  | "competitor"
  | "support"
  | "irrelevant"
  | "low_intent";

export interface IntentResult {
  query: string;
  intent: SearchIntent;
  confidence: number; // 0-1
  reason: string;
  suggestedAction: string;
  isWasteful: boolean;
}

export interface BatchIntentResult {
  results: IntentResult[];
  processedAt: string;
  model: string;
}

const SYSTEM_PROMPT = `You are an expert Google Ads search intent classifier for an e-commerce advertising platform.

You will receive a list of search queries and must classify each one's intent and determine if it's wasting ad spend.

Intent categories:
- buyer: High purchase intent (e.g., "buy", "order", "price", "shop", product names with purchase signals)
- research: Informational, comparison shopping (e.g., "best", "review", "vs", "comparison", "how to choose")
- competitor: Searching for a competitor brand (e.g., competitor brand names, "[competitor] alternative")
- support: Looking for product support/repairs (e.g., "repair", "fix", "manual", "guide", "how to use")
- irrelevant: Completely unrelated to the product/service
- low_intent: Generic browsing with no clear purchase signal (e.g., "what is", "types of", "history of")

Return ONLY a valid JSON array. No explanation outside JSON.`;

const USER_PROMPT_TEMPLATE = (queries: string[], context?: string) => `
Context: ${context || "E-commerce store selling products online"}

Classify these ${queries.length} search queries:
${queries.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

Return a JSON array with exactly ${queries.length} objects, one per query, in this exact format:
[
  {
    "query": "original query text",
    "intent": "buyer|research|competitor|support|irrelevant|low_intent",
    "confidence": 0.95,
    "reason": "Short explanation of why",
    "suggestedAction": "keep|add_negative|review|block",
    "isWasteful": true
  }
]`;

export class IntentClassifier {
  private client: Anthropic;
  private model: string;

  constructor() {
    const config = getConfig();
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    this.model = config.AI_MODEL;
  }

  async classify(
    queries: string[],
    context?: string,
    batchSize = 50
  ): Promise<BatchIntentResult> {
    if (queries.length === 0) return { results: [], processedAt: new Date().toISOString(), model: this.model };

    const results: IntentResult[] = [];

    // Process in batches to avoid token limits
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await this.classifyBatch(batch, context);
      results.push(...batchResults);
    }

    return {
      results,
      processedAt: new Date().toISOString(),
      model: this.model,
    };
  }

  private async classifyBatch(queries: string[], context?: string): Promise<IntentResult[]> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: USER_PROMPT_TEMPLATE(queries, context),
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found in AI response");

      const parsed = JSON.parse(jsonMatch[0]) as IntentResult[];

      // Validate and normalize
      return parsed.map((r, idx) => ({
        query: r.query || queries[idx],
        intent: this.normalizeIntent(r.intent),
        confidence: Math.min(1, Math.max(0, r.confidence || 0.5)),
        reason: r.reason || "",
        suggestedAction: r.suggestedAction || "review",
        isWasteful: Boolean(r.isWasteful),
      }));
    } catch (err) {
      logger.error({ err, queries }, "Intent classification failed");
      // Return fallback results
      return queries.map((q) => ({
        query: q,
        intent: "research" as SearchIntent,
        confidence: 0.1,
        reason: "Classification failed",
        suggestedAction: "review",
        isWasteful: false,
      }));
    }
  }

  private normalizeIntent(intent: string): SearchIntent {
    const valid: SearchIntent[] = ["buyer", "research", "competitor", "support", "irrelevant", "low_intent"];
    return valid.includes(intent as SearchIntent) ? (intent as SearchIntent) : "research";
  }

  // Rule-based pre-filter (fast, no AI cost)
  static quickFilter(query: string): { isWasteful: boolean; reason: string } | null {
    const lower = query.toLowerCase();

    const wastefulPatterns: Array<[RegExp, string]> = [
      [/\bfree\b/, "Contains 'free' - non-buyer intent"],
      [/\b(used|second.?hand|refurbished)\b/, "Used item seeker"],
      [/\b(repair|fix|broken|not working)\b/, "Support seeker"],
      [/\b(how to|how do|tutorial|guide|manual)\b/, "Informational query"],
      [/\b(jobs|career|vacancy|hiring|work at)\b/, "Job seeker"],
      [/\b(parts|spare parts|replacement)\b/, "Parts seeker"],
      [/\bdiy\b/, "DIY query"],
      [/\b(history|origin|when was|who invented)\b/, "Educational query"],
      [/\b(wikipedia|wiki)\b/, "Wikipedia lookup"],
    ];

    for (const [pattern, reason] of wastefulPatterns) {
      if (pattern.test(lower)) {
        return { isWasteful: true, reason };
      }
    }

    return null;
  }
}
