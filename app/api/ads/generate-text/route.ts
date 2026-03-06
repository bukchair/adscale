import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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

  const apiKey =
    connections?.anthropic?.api_key ||
    process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY לא מוגדר — הוסף אותו בחיבורים או ב-.env.local" }, { status: 500 });
  }

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
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
