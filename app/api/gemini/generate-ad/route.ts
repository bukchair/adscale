import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini ad text generation endpoint — priority over Claude when Gemini key is present.
 * POST body: {
 *   product: WooCommerce product object,
 *   platform: "meta" | "google" | "tiktok",
 *   lang: "he" | "en",
 *   tone: "enthusiastic" | "professional" | "playful",
 *   connections: { gemini?: { api_key, model } }
 * }
 * Returns: { variations: [{headline, description, cta, emoji}] }
 */

const PLATFORM_SPECS: Record<string, { name: string; headline_chars: number; desc_chars: number; cta_he: string[]; cta_en: string[] }> = {
  meta: {
    name: "Meta (Facebook/Instagram)",
    headline_chars: 40, desc_chars: 125,
    cta_he: ["קנה עכשיו", "גלה עוד", "הזמן היום", "קבל הנחה"],
    cta_en: ["Shop Now", "Learn More", "Order Today", "Get Discount"],
  },
  google: {
    name: "Google Ads",
    headline_chars: 30, desc_chars: 90,
    cta_he: ["הזמן עכשיו", "קנה היום", "גלה מחירים", "צפה במבצע"],
    cta_en: ["Order Now", "Buy Today", "See Prices", "View Offer"],
  },
  tiktok: {
    name: "TikTok Ads",
    headline_chars: 50, desc_chars: 100,
    cta_he: ["שופ עכשיו", "גלה עוד", "קנה עכשיו"],
    cta_en: ["Shop Now", "Discover More", "Buy Now"],
  },
};

export async function POST(req: NextRequest) {
  const connectionsHeader = req.headers.get("x-connections");
  let conns: Record<string, Record<string, string>> = {};
  try { conns = JSON.parse(connectionsHeader || "{}"); } catch {}

  const { product, platform = "meta", lang = "he", tone = "enthusiastic", connections } = await req.json();

  const apiKey =
    connections?.gemini?.api_key ||
    conns.gemini?.api_key ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY לא מוגדר" }, { status: 400 });
  }

  const model = connections?.gemini?.model || conns.gemini?.model || "gemini-2.0-flash";
  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.meta;
  const isHe = lang === "he";

  const name = product.name || "";
  const shortDesc = (product.short_description || product.shortDescription || product.description || "").replace(/<[^>]+>/g, "").slice(0, 400);
  const longDesc  = (product.longDescription || product.description || "").replace(/<[^>]+>/g, "").slice(0, 400);
  const cats = (product.categories || []).map((c: any) => typeof c === "string" ? c : c.name).join(", ");
  const price = product.sale_price || product.salePrice || product.price || 0;
  const regPrice = product.regular_price || product.price || 0;
  const saleInfo = product.sale_price || product.salePrice
    ? (isHe ? `מחיר מקורי ₪${regPrice}, מבצע ₪${price}` : `Original ₪${regPrice}, Sale ₪${price}`)
    : (isHe ? `מחיר: ₪${price}` : `Price: ₪${price}`);

  // Include image alt texts to help Gemini understand product visuals
  const imageAlts = (product.images || []).slice(0, 4).map((img: any) => img.alt || img.src).filter(Boolean);
  const visualContext = imageAlts.length
    ? (isHe ? `תיאור תמונות המוצר: ${imageAlts.join("; ")}` : `Product image descriptions: ${imageAlts.join("; ")}`)
    : "";

  const toneMap = {
    enthusiastic: isHe ? "נלהב, מרגש ומניע לפעולה" : "enthusiastic, exciting and action-driving",
    professional: isHe ? "מקצועי, אמין ועסקי" : "professional, trustworthy and business-like",
    playful:      isHe ? "שובב, קליל וחיובי" : "playful, light and positive",
  };
  const toneDesc = toneMap[tone as keyof typeof toneMap] || toneMap.enthusiastic;

  const ctaOptions = (isHe ? spec.cta_he : spec.cta_en).join(", ");

  const prompt = isHe
    ? `אתה קופירייטר מומחה לפרסום דיגיטלי בישראל. צור 3 וריאציות שונות של מודעה ל-${spec.name}.

פרטי מוצר:
שם: ${name}
${cats ? `קטגוריה: ${cats}` : ""}
${saleInfo}
${shortDesc ? `תיאור קצר: ${shortDesc}` : ""}
${longDesc && longDesc !== shortDesc ? `תיאור מלא: ${longDesc}` : ""}
${visualContext}

דרישות לכל וריאציה:
- כותרת: עד ${spec.headline_chars} תווים
- תיאור: עד ${spec.desc_chars} תווים
- CTA: בחר מ: ${ctaOptions}
- סגנון: ${toneDesc}
- בעברית, ישיר לצרכן ישראלי

החזר JSON בלבד (ללא markdown):
{"variations":[{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."}]}`
    : `You are an expert digital advertising copywriter. Create 3 different ad variations for ${spec.name}.

Product details:
Name: ${name}
${cats ? `Category: ${cats}` : ""}
${saleInfo}
${shortDesc ? `Short description: ${shortDesc}` : ""}
${longDesc && longDesc !== shortDesc ? `Full description: ${longDesc}` : ""}
${visualContext}

Requirements per variation:
- Headline: max ${spec.headline_chars} characters
- Description: max ${spec.desc_chars} characters
- CTA: choose from: ${ctaOptions}
- Tone: ${toneDesc}

Return JSON only (no markdown):
{"variations":[{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."},{"headline":"...","description":"...","cta":"...","emoji":"..."}]}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model, contents: prompt });
    const raw = (response.text ?? "").trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
    const parsed = JSON.parse(raw);
    return NextResponse.json({ ...parsed, engine: "gemini" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
