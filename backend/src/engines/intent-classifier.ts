/**
 * Search Intent Classifier
 * Uses Claude to classify query intent and recommend action.
 * Returns structured JSON with intent, confidence, reason, action.
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger/index.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SearchIntent =
  | "buyer" | "research" | "competitor" | "support"
  | "irrelevant" | "low_intent";

export interface IntentResult {
  query:      string;
  intent:     SearchIntent;
  confidence: number;         // 0-1
  reason:     string;
  action:     "keep" | "monitor" | "add_negative" | "add_exact";
  negSuggestion?: string;     // normalized negative keyword if action = add_negative
}

const INTENT_PROMPT = (queries: string[]) => `
You are an expert Google Ads analyst. Classify each search query by intent.

INTENT DEFINITIONS:
- buyer: High purchase intent. E.g. "buy red shoes size 10", "order online", "price", "cheap", "best deal"
- research: Gathering info before deciding. E.g. "how to choose", "review", "comparison", "vs", "top 10"
- competitor: Searching for a competitor brand. E.g. brand names you don't sell
- support: Post-purchase or usage help. E.g. "how to use", "manual", "instructions", "setup guide"
- irrelevant: Completely off-topic. E.g. jobs, DIY, free, used, repair, tutorial, parts
- low_intent: Vague or early-stage. E.g. "shoes" (single word with no modifier)

ACTIONS:
- keep: High-value, keep bidding
- monitor: Worth watching — not sure yet
- add_negative: Wasteful — add as negative keyword
- add_exact: Convert to exact match for budget control

Return ONLY a JSON array, one object per query, no extra text:
[
  {
    "query": "...",
    "intent": "buyer|research|competitor|support|irrelevant|low_intent",
    "confidence": 0.0-1.0,
    "reason": "one sentence",
    "action": "keep|monitor|add_negative|add_exact",
    "negSuggestion": "keyword to add as negative (if action=add_negative, else omit)"
  }
]

Queries to classify:
${queries.map((q, i) => `${i + 1}. "${q}"`).join("\n")}
`.trim();

export async function classifyIntents(
  queries: string[]
): Promise<IntentResult[]> {
  if (!queries.length) return [];

  // Batch into chunks of 50
  const chunks: string[][] = [];
  for (let i = 0; i < queries.length; i += 50) {
    chunks.push(queries.slice(i, i + 50));
  }

  const results: IntentResult[] = [];
  for (const chunk of chunks) {
    try {
      const response = await client.messages.create({
        model:      "claude-haiku-4-5-20251001",  // fast + cheap for bulk classification
        max_tokens: 4096,
        messages:   [{ role: "user", content: INTENT_PROMPT(chunk) }],
      });

      const text   = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = extractJson<IntentResult[]>(text);
      if (parsed) results.push(...parsed);
    } catch (err) {
      logger.error({ err, chunk }, "Intent classification failed");
      chunk.forEach((q) =>
        results.push({
          query:      q,
          intent:     "low_intent",
          confidence: 0,
          reason:     "Classification failed",
          action:     "monitor",
        })
      );
    }
  }
  return results;
}

/**
 * Safely extract a JSON value from a response that may contain markdown fences.
 * Returns null if no parseable JSON is found.
 */
function extractJson<T>(text: string): T | null {
  // Strip markdown code fences if present
  const stripped = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Try to find JSON array or object within the text
    const match = stripped.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try { return JSON.parse(match[1]) as T; } catch { /* fall through */ }
    }
    return null;
  }
}
