// ============================================================
// Dashboard Insights Engine
// Generates AI-powered insights using the prompts library
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../config/index.js";
import { PROMPTS } from "../prompts/index.js";
import { logger } from "../../utils/logger.js";

export class InsightsEngine {
  private client: Anthropic;
  private model: string;

  constructor() {
    const config = getConfig();
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    this.model = config.AI_MODEL;
  }

  async diagnose(campaign: Parameters<typeof PROMPTS.campaignDiagnostics>[0]) {
    const prompt = PROMPTS.campaignDiagnostics(campaign);
    return this.callAI(prompt.system, prompt.user);
  }

  async profitInsights(campaigns: Parameters<typeof PROMPTS.profitInsights>[0]["campaigns"]) {
    const prompt = PROMPTS.profitInsights({ campaigns });
    return this.callAI(prompt.system, prompt.user);
  }

  async budgetRecommendations(campaigns: Parameters<typeof PROMPTS.budgetRecommendation>[0]) {
    const prompt = PROMPTS.budgetRecommendation(campaigns);
    return this.callAI(prompt.system, prompt.user);
  }

  private async callAI(system: string, user: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (!jsonMatch) throw new Error("No JSON in AI response");

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      logger.error({ err }, "AI insights call failed");
      throw err;
    }
  }
}
