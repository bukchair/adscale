// ============================================================
// Production AI Prompts Library
// All prompts return structured JSON
// ============================================================

export const PROMPTS = {

  // ── Search Intent Classification ─────────────────────────
  searchIntentClassification: (queries: string[], context?: string) => ({
    system: `You are a Google Ads search intent expert for an e-commerce advertising platform.
Classify each search query's intent. Return ONLY valid JSON array, no explanations.`,
    user: `E-commerce context: ${context || "Online store selling products"}

Classify these queries into intent categories:
- buyer: High purchase intent (buy, price, order, shop)
- research: Comparing, reviewing, information gathering
- competitor: Searching for competitor brands
- support: Repairs, manuals, how-to for existing product
- irrelevant: Completely off-topic
- low_intent: Generic browsing, no purchase signal

Queries:
${queries.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

Return JSON array (${queries.length} items):
[{"query":"...","intent":"buyer","confidence":0.95,"reason":"...","suggestedAction":"keep|add_negative|review|block","isWasteful":false}]`,
  }),

  // ── Negative Keyword Detection ────────────────────────────
  negativeKeywordDetection: (queries: Array<{ query: string; spend: number; conversions: number }>, context?: string) => ({
    system: `You are a Google Ads waste detection specialist.
Identify search queries that are wasting ad spend and suggest negative keywords.
Return ONLY valid JSON. Be conservative — only flag clear waste.`,
    user: `Store context: ${context || "E-commerce store"}

For each query, determine if it wastes budget. Only suggest negatives for clear waste cases.

Queries with spend data:
${queries.map((q, i) => `${i + 1}. "${q.query}" | spent: ₪${q.spend.toFixed(2)} | conversions: ${q.conversions}`).join("\n")}

For wasteful queries only, return JSON array:
[{
  "query": "original query",
  "suggestedText": "negative keyword",
  "matchType": "EXACT|PHRASE|BROAD",
  "confidence": 0.9,
  "risk": "low|medium|high|critical",
  "reason": "Why this wastes budget",
  "wasteEstimate": 25.50
}]

Return empty array [] if no waste detected.`,
  }),

  // ── Creative Generation ───────────────────────────────────
  creativeGeneration: (product: string, description: string, usp: string[], language: "he" | "en", tone: string, variantCount: number) => ({
    system: `You are a world-class Google Ads copywriter. Write high-converting ${language === "he" ? "Hebrew" : "English"} ad copy.
Rules: Headlines ≤30 chars each. Descriptions ≤90 chars each. Return ONLY JSON array.`,
    user: `Create ${variantCount} distinct ad creative variants for:
Product: ${product}
${description ? `Description: ${description}` : ""}
${usp.length ? `Key benefits: ${usp.join(", ")}` : ""}
Tone: ${tone}
Language: ${language === "he" ? "Hebrew (RTL)" : "English"}

Each variant must use a different psychological angle (price, quality, urgency, social proof, etc.)

Return JSON array:
[{
  "headlines": ["max 30 chars each", ...], // 10-15 headlines
  "descriptions": ["max 90 chars each", ...], // 3-4 descriptions
  "angle": "value angle name",
  "hook": "main attention hook",
  "cta": "call to action text",
  "tone": "professional|urgent|friendly|luxury|bold",
  "targetPersona": "who this targets",
  "strengthScore": 85,
  "notes": "why this variant works"
}]`,
  }),

  // ── Budget Recommendation ─────────────────────────────────
  budgetRecommendation: (campaigns: Array<{ name: string; spend: number; budget: number; roas: number; profit: number; pacingRate: number }>) => ({
    system: `You are a Google Ads budget optimization expert.
Analyze campaign data and recommend precise budget adjustments.
Consider: profitability, pacing, ROAS trends. Return ONLY JSON.`,
    user: `Analyze these campaigns and recommend budget changes:

${campaigns.map((c, i) => `Campaign ${i + 1}: ${c.name}
  Daily budget: ₪${c.budget}
  Avg daily spend: ₪${c.spend}
  Pacing: ${(c.pacingRate * 100).toFixed(0)}%
  ROAS: ${c.roas.toFixed(2)}x
  Net profit (30d): ₪${c.profit}`).join("\n\n")}

Rules:
- Only increase profitable campaigns (profit > 0)
- Max increase: +50% at once
- Max decrease: -30% at once
- Flag campaigns losing money for review

Return JSON array:
[{
  "campaignName": "name",
  "currentBudget": 500,
  "suggestedBudget": 600,
  "changePercent": 20,
  "reasoning": "explanation",
  "confidence": 0.85,
  "risk": "low|medium|high"
}]`,
  }),

  // ── Campaign Diagnostics ──────────────────────────────────
  campaignDiagnostics: (campaign: { name: string; spend: number; revenue: number; profit: number; roas: number; ctr: number; cvr: number; impressionShare: number; qualityScore: number; daysSinceCreativeRefresh: number }) => ({
    system: `You are a senior Google Ads account manager diagnosing campaign performance.
Identify problems and opportunities. Be specific and actionable. Return ONLY JSON.`,
    user: `Diagnose this campaign:

Campaign: ${campaign.name}
Spend: ₪${campaign.spend}
Revenue: ₪${campaign.revenue}
Net Profit: ₪${campaign.profit}
ROAS: ${campaign.roas.toFixed(2)}x
CTR: ${(campaign.ctr * 100).toFixed(2)}%
CVR: ${(campaign.cvr * 100).toFixed(2)}%
Impression Share: ${campaign.impressionShare}%
Quality Score: ${campaign.qualityScore}/10
Days since creative refresh: ${campaign.daysSinceCreativeRefresh}

Return diagnosis JSON:
{
  "overallHealth": "excellent|good|fair|poor|critical",
  "healthScore": 75,
  "topIssues": [{"issue": "...", "impact": "high|medium|low", "fix": "..."}],
  "opportunities": [{"opportunity": "...", "estimatedImpact": "...", "effort": "easy|medium|hard"}],
  "immediateActions": ["action 1", "action 2"],
  "summary": "2-sentence overall assessment"
}`,
  }),

  // ── Profit Insights ───────────────────────────────────────
  profitInsights: (data: { campaigns: Array<{ name: string; spend: number; revenue: number; profit: number; poas: number; margin: number }> }) => ({
    system: `You are an e-commerce profit analyst specializing in paid advertising.
Provide actionable insights to improve true profitability. Return ONLY JSON.`,
    user: `Analyze profitability across campaigns:

${data.campaigns.map((c) => `${c.name}: spend=₪${c.spend}, revenue=₪${c.revenue}, profit=₪${c.profit}, POAS=${c.poas.toFixed(2)}x, margin=${c.margin.toFixed(1)}%`).join("\n")}

Return JSON:
{
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "quickWins": [{"action": "...", "estimatedProfitIncrease": 500, "effort": "easy"}],
  "riskAlerts": [{"risk": "...", "severity": "high|medium|low"}],
  "budgetReallocation": [{"from": "campaign A", "to": "campaign B", "amount": 200, "reason": "..."}],
  "forecastedProfitImprovement": 15,
  "summary": "Executive summary in 2 sentences"
}`,
  }),

} as const;

export type PromptKey = keyof typeof PROMPTS;
