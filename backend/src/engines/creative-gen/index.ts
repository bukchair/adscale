// ============================================================
// Creative Generation Engine
// Generates ad copy using Claude AI
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

export interface CreativeInput {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  usp?: string[];           // unique selling points
  price?: number;
  currency?: string;
  brandTone?: string;       // "professional", "friendly", "urgent", "luxury"
  keywords?: string[];      // target keywords to include
  campaignType?: string;    // "search", "display", "shopping"
  competitorWeaknesses?: string[];
  existingHeadlines?: string[]; // for variation
  language?: string;        // "en", "he", etc.
}

export interface CreativeVariant {
  headlines: string[];      // up to 15 for RSA
  descriptions: string[];   // up to 4 for RSA
  angle: string;            // value proposition angle
  hook: string;             // attention hook
  cta: string;              // call to action
  tone: string;
  targetPersona: string;
  strengthScore: number;    // 0-100 estimated effectiveness
  notes: string;            // why this variant works
}

export interface CreativeOutput {
  productName: string;
  variants: CreativeVariant[];
  generatedAt: string;
  model: string;
}

export class CreativeEngine {
  private client: Anthropic;
  private model: string;

  constructor() {
    const config = getConfig();
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    this.model = config.AI_MODEL;
  }

  async generate(input: CreativeInput, variantCount = 3): Promise<CreativeOutput> {
    const isHebrew = input.language === "he";

    const SYSTEM = `You are a world-class Google Ads copywriter specializing in high-conversion ad creative.
You write ${isHebrew ? "Hebrew" : "English"} ad copy that:
- Grabs attention instantly
- Communicates clear value
- Uses psychological triggers (urgency, social proof, benefit-first)
- Stays within Google Ads character limits (headlines ≤30 chars, descriptions ≤90 chars)
- Includes CTAs that drive clicks

Always return valid JSON only. No explanations outside JSON.`;

    const PROMPT = `Create ${variantCount} distinct Google Ads creative variants for:

Product: ${input.productName}
${input.productDescription ? `Description: ${input.productDescription}` : ""}
${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ""}
${input.usp?.length ? `USPs: ${input.usp.join(", ")}` : ""}
${input.price ? `Price: ${input.currency || "₪"}${input.price}` : ""}
${input.brandTone ? `Tone: ${input.brandTone}` : ""}
${input.keywords?.length ? `Keywords to include: ${input.keywords.join(", ")}` : ""}
${input.campaignType ? `Campaign type: ${input.campaignType}` : ""}
Language: ${isHebrew ? "Hebrew (RTL)" : "English"}

Requirements:
- Each variant must use a DIFFERENT angle/approach
- Headlines must be ≤30 characters each
- Descriptions must be ≤90 characters each
- Include 10-15 headlines and 3-4 descriptions per variant
- Make CTAs specific and action-oriented

Return JSON array with exactly ${variantCount} variants:
[
  {
    "headlines": ["Headline 1", "Headline 2", ...],
    "descriptions": ["Description 1", "Description 2", ...],
    "angle": "The strategic angle (e.g., price leader, quality, urgency)",
    "hook": "The main attention hook",
    "cta": "Primary call to action",
    "tone": "professional|urgent|friendly|luxury|bold",
    "targetPersona": "Who this variant is designed for",
    "strengthScore": 85,
    "notes": "Why this variant would perform well"
  }
]`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: "user", content: PROMPT }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON in creative response");

      const variants = JSON.parse(jsonMatch[0]) as CreativeVariant[];

      // Validate character limits
      const validated = variants.map((v) => ({
        ...v,
        headlines: v.headlines.map((h) => h.slice(0, 30)),
        descriptions: v.descriptions.map((d) => d.slice(0, 90)),
        strengthScore: Math.min(100, Math.max(0, v.strengthScore || 70)),
      }));

      return {
        productName: input.productName,
        variants: validated,
        generatedAt: new Date().toISOString(),
        model: this.model,
      };
    } catch (err) {
      logger.error({ err }, "Creative generation failed");
      throw err;
    }
  }

  async generateRefresh(
    existing: CreativeVariant,
    input: CreativeInput,
    fatigueReason?: string
  ): Promise<CreativeVariant> {
    const PROMPT = `The following Google Ads creative is showing fatigue signs.
${fatigueReason ? `Fatigue reason: ${fatigueReason}` : ""}

Existing creative:
Headlines: ${existing.headlines.join(" | ")}
Descriptions: ${existing.descriptions.join(" | ")}
Angle: ${existing.angle}

Create a COMPLETELY DIFFERENT variant for ${input.productName} that:
- Uses a different angle and psychological trigger
- Feels fresh and new
- Maintains the same quality level

Return a single JSON object (same format as before, NOT an array).`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{ role: "user", content: PROMPT }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in refresh response");

    const variant = JSON.parse(jsonMatch[0]) as CreativeVariant;
    return {
      ...variant,
      headlines: variant.headlines.map((h) => h.slice(0, 30)),
      descriptions: variant.descriptions.map((d) => d.slice(0, 90)),
    };
  }
}
