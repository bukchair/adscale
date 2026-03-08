import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

const PLATFORM_SPECS: Record<string, { name: string; headline_chars: number; desc_chars: number; cta_examples: string[] }> = {
  meta: {
    name: "Meta (Facebook/Instagram)",
    headline_chars: 40,
    desc_chars: 125,
    cta_examples: ["קנה עכשיו", "גלה עוד", "הזמן היום", "קבל הנחה"],
  },
  google: {
    name: "Google Ads",
    headline_chars: 30,
    desc_chars: 90,
    cta_examples: ["הזמן עכשיו", "קנה היום", "גלה מחירים", "צפה במבצע"],
  },
  tiktok: {
    name: "TikTok Ads",
    headline_chars: 50,
    desc_chars: 100,
    cta_examples: ["שופ עכשיו", "גלה עוד", "קנה עכשיו"],
  },
};

export async function POST(req: NextRequest) {
  const { product, platform, lang = "he", tone = "enthusiastic", connections } = await req.json();

  const connectionsHeader = req.headers.get("x-connections");
  let conns: Record<string, Record<string, string>> = {};
  try { conns = JSON.parse(connectionsHeader || "{}"); } catch {}

  // Gemini takes priority if key is available
  const geminiKey =
    connections?.gemini?.api_key ||
    conns.gemini?.api_key ||
    process.env.GEMINI_API_KEY;

  if (geminiKey) {
    return generateWithGemini(geminiKey, connections?.gemini?.model || conns.gemini?.model, product, platform, lang, tone);
  }

  // Fall back to Claude
  const claudeKey =
    connections?.anthropic?.api_key ||
    conns.anthropic?.api_key ||
    process.env.ANTHROPIC_API_KEY;

  if (!claudeKey) {
    return NextResponse.json({ error: "לא הוגדר מפתח AI — הוסף Gemini או Anthropic בחיבורים" }, { status: 500 });
  }

  return generateWithClaude(claudeKey, product, platform, lang, tone);
}

async function generateWithGemini(
  apiKey: string,
  modelOverride: string | undefined,
  product: any,
  platform: string,
  lang: string,
  tone: string
): Promise<NextResponse> {
  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.meta;
  const isHe = lang === "he";
  const model = modelOverride || "gemini-2.0-flash";

  const saleInfo = product.sale_price
    ? `מחיר מקורי: ₪${product.regular_price}, מבצע: ₪${product.sale_price}`
    : `מחיר: ₪${product.price}`;
  const cats = (product.categories || []).map((c: any) => typeof c === "string" ? c : c.name).join(", ");
  const desc = (product.short_description || product.description || "").replace(/<[^>]+>/g, "").slice(0, 400);
  const imageAlts = (product.images || []).slice(0, 4).map((img: any) => img.alt || "").filter(Boolean);
  const visualCtx = imageAlts.length
    ? (isHe ? `\nתיאור תמונות: ${imageAlts.join("; ")}` : `\nImage descriptions: ${imageAlts.join("; ")}`)
    : "";

  const toneMap = { enthusiastic: isHe ? "נלהב" : "enthusiastic", professional: isHe ? "מקצועי" : "professional", playful: isHe ? "שובב" : "playful" };
  const toneDesc = toneMap[tone as keyof typeof toneMap] || "enthusiastic";

  const prompt = isHe
    ? `אתה קופירייטר מומחה לפרסום דיגיטלי. צור 3 וריאציות מודעה ל-${spec.name}.

מוצר: ${product.name}
קטגוריה: ${cats}
${saleInfo}
תיאור: ${desc}${visualCtx}

דרישות:
- כותרת: עד ${spec.headline_chars} תווים
- תיאור: עד ${spec.desc_chars} תווים
- CTA: ${spec.cta_examples.join(", ")}
- סגנון: ${toneDesc}

החזר JSON בלבד:
{"variations":[{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."}]}`
    : `Expert ad copywriter. Create 3 variations for ${spec.name}.

Product: ${product.name}
Category: ${cats}
${saleInfo.replace(/מחיר/g, "Price").replace(/מקורי/g, "original").replace(/מבצע/g, "sale")}
Description: ${desc}${visualCtx}

Requirements:
- Headline: max ${spec.headline_chars} chars
- Description: max ${spec.desc_chars} chars
- CTA: Shop Now, Learn More, Order Today
- Tone: ${toneDesc}

Return JSON only:
{"variations":[{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."}]}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model, contents: prompt });
    const raw = (response.text ?? "").trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(raw);
    return NextResponse.json({ ...parsed, engine: "gemini" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function generateWithClaude(
  apiKey: string,
  product: any,
  platform: string,
  lang: string,
  tone: string
): Promise<NextResponse> {
  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.meta;
  const isHebrew = lang === "he";

  const saleInfo = product.sale_price
    ? `המחיר המקורי: ₪${product.regular_price}, מחיר מבצע: ₪${product.sale_price}`
    : `מחיר: ₪${product.price}`;

  const prompt = isHebrew
    ? `אתה קופירייטר מומחה לפרסום דיגיטלי בישראל. צור 3 וריאציות שונות של מודעה ל-${spec.name}.

מוצר: ${product.name}
תיאור: ${product.short_description || product.description?.replace(/<[^>]+>/g, "").slice(0, 300)}
קטגוריה: ${product.categories?.map((c: any) => c.name).join(", ")}
${saleInfo}

דרישות לכל וריאציה:
- כותרת: עד ${spec.headline_chars} תווים
- תיאור: עד ${spec.desc_chars} תווים
- CTA (קריאה לפעולה): בחר מהאפשרויות: ${spec.cta_examples.join(", ")}
- סגנון: ${tone === "enthusiastic" ? "נלהב ומעורר התרגשות" : tone === "professional" ? "מקצועי ואמין" : "שובב וקליל"}
- בעברית, ישיר לצרכן ישראלי

החזר JSON בפורמט הבא (בלי markdown):
{
  "variations": [
    {"headline": "...", "description": "...", "cta": "...", "emoji": "..."},
    {"headline": "...", "description": "...", "cta": "...", "emoji": "..."},
    {"headline": "...", "description": "...", "cta": "...", "emoji": "..."}
  ]
}`
    : `You are an expert digital advertising copywriter. Create 3 different ad variations for ${spec.name}.

Product: ${product.name}
Description: ${product.short_description || product.description?.replace(/<[^>]+>/g, "").slice(0, 300)}
Category: ${product.categories?.map((c: any) => c.name).join(", ")}
${saleInfo}

Requirements per variation:
- Headline: max ${spec.headline_chars} characters
- Description: max ${spec.desc_chars} characters
- CTA: choose from: ${spec.cta_examples.map(c => c === "קנה עכשיו" ? "Shop Now" : c === "גלה עוד" ? "Learn More" : "Order Today").join(", ")}
- Tone: ${tone === "enthusiastic" ? "enthusiastic and exciting" : tone === "professional" ? "professional and trustworthy" : "playful and light"}

Return JSON (no markdown):
{
  "variations": [
    {"headline": "...", "description": "...", "cta": "...", "emoji": "..."},
    {"headline": "...", "description": "...", "cta": "...", "emoji": "..."},
    {"headline": "...", "description": "...", "cta": "...", "emoji": "..."}
  ]
}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as any).text.trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr);
    return NextResponse.json({ ...parsed, engine: "claude" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
