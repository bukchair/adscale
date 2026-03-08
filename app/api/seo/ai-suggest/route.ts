import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

/**
 * AI SEO suggestion — prefers Gemini when key available, falls back to Claude, then rule-based.
 * POST body: { issueType, productName, productDescription, productCategory, price, lang }
 * Returns: { suggestion: string, field: string, engine: "gemini"|"claude"|"rule" }
 */
export async function POST(req: NextRequest) {
  const connectionsHeader = req.headers.get("x-connections");
  let conns: Record<string, Record<string, string>> = {};
  try { conns = JSON.parse(connectionsHeader || "{}"); } catch {}

  const body = await req.json().catch(() => ({})) as {
    issueType: string;
    productName: string;
    productDescription?: string;
    productCategory?: string;
    price?: number;
    lang?: string;
    connections?: Record<string, Record<string, string>>;
  };

  const { issueType, productName, productDescription = "", productCategory = "", price, lang = "he" } = body;
  const isHe = lang === "he";

  const fieldMap: Record<string, string> = {
    missing_title: "name",
    missing_meta:  "short_description",
    missing_alt:   "alt",
    thin_content:  "short_description",
    duplicate_meta:"short_description",
    weak_slug:     "slug",
    no_schema:     "schema",
  };
  const field = fieldMap[issueType] ?? "short_description";

  // Gemini takes priority
  const geminiKey =
    body.connections?.gemini?.api_key ||
    conns.gemini?.api_key ||
    process.env.GEMINI_API_KEY;

  if (geminiKey) {
    const model = body.connections?.gemini?.model || conns.gemini?.model || "gemini-2.0-flash";
    const prompt = buildPrompt(issueType, productName, productDescription, productCategory, price, isHe);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = (response.text ?? "").trim().replace(/^["'`]+|["'`]+$/g, "").replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
      return NextResponse.json({ suggestion: text, field, engine: "gemini" });
    } catch (e: any) {
      // fall through to Claude
    }
  }

  // Claude fallback
  const claudeKey =
    body.connections?.anthropic?.api_key ||
    conns.anthropic?.api_key ||
    process.env.ANTHROPIC_API_KEY;

  if (claudeKey) {
    const prompt = buildPrompt(issueType, productName, productDescription, productCategory, price, isHe);
    try {
      const client = new Anthropic({ apiKey: claudeKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      const text = ((message.content[0] as any).text ?? "").trim()
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/^```[a-z]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
      return NextResponse.json({ suggestion: text, field, engine: "claude" });
    } catch (e: any) {
      // fall through to rule-based
    }
  }

  // Rule-based fallback
  const ruleBased = buildRuleBased(issueType, productName, productDescription, productCategory, price, isHe);
  return NextResponse.json({ suggestion: ruleBased, field, engine: "rule", demo: true });
}

function buildPrompt(issueType: string, name: string, desc: string, category: string, price: number | undefined, isHe: boolean): string {
  const cleanDesc = desc.replace(/<[^>]+>/g, "").slice(0, 400);
  const priceStr = price ? `₪${price}` : "";

  const tasks: Record<string, string> = {
    missing_title: isHe
      ? `כתוב כותרת SEO אופטימלית (40-60 תווים) עבור מוצר WooCommerce. הכלל את שם המוצר, מילת מפתח רלוונטית ואת שם החנות. החזר רק את הכותרת, ללא הסבר.`
      : `Write an optimal SEO title (40-60 chars) for a WooCommerce product. Include product name, relevant keyword, and store name. Return only the title.`,

    missing_meta: isHe
      ? `כתוב תיאור meta SEO אטרקטיבי (120-155 תווים) עבור מוצר זה. כלול מילות מפתח, יתרונות ו-CTA. החזר רק את התיאור.`
      : `Write an attractive SEO meta description (120-155 chars) for this product. Include keywords, benefits, CTA. Return only the description.`,

    thin_content: isHe
      ? `כתוב תיאור קצר (short_description) SEO מעולה לדף מוצר WooCommerce (80-150 מילים). כלול יתרונות, שימושים ומילות מפתח. בעברית. החזר רק את הטקסט.`
      : `Write an excellent SEO short description for a WooCommerce product page (80-150 words). Include benefits, uses, keywords. Return only the text.`,

    missing_alt: isHe
      ? `כתוב טקסט alt SEO אופטימלי (עד 125 תווים) לתמונת מוצר. תאר את המוצר, הצבע/גודל אם ידוע, וכלול מילות מפתח. החזר רק את הטקסט.`
      : `Write optimal SEO alt text (up to 125 chars) for a product image. Describe the product, include color/size if known, add keywords. Return only the text.`,

    duplicate_meta: isHe
      ? `כתוב תיאור meta ייחודי ו-SEO אופטימלי (120-155 תווים) שמבדיל מוצר זה ממוצרים אחרים בחנות. החזר רק את התיאור.`
      : `Write a unique SEO meta description (120-155 chars) that differentiates this product from others in the store. Return only the description.`,

    weak_slug: isHe
      ? `צור slug URL SEO אופטימלי באנגלית למוצר זה (מילים קטנות, מחוברות במקפים, 3-6 מילים). לדוגמה: running-shoes-x1-pro. החזר רק את ה-slug.`
      : `Create an SEO-optimal URL slug for this product (lowercase, hyphen-separated, 3-6 words). E.g., running-shoes-x1-pro. Return only the slug.`,

    no_schema: isHe
      ? `צור JSON-LD schema markup מסוג Product עבור מוצר זה. כלול name, description, price, priceCurrency. החזר רק את ה-JSON.`
      : `Create a Product JSON-LD schema markup for this product. Include name, description, price, priceCurrency. Return only the JSON.`,
  };

  const task = tasks[issueType] ?? tasks.missing_meta;

  return isHe
    ? `${task}\n\nמוצר: ${name}\nקטגוריה: ${category}\nמחיר: ${priceStr}\nתיאור קיים: ${cleanDesc || "(אין)"}`
    : `${task}\n\nProduct: ${name}\nCategory: ${category}\nPrice: ${priceStr}\nExisting description: ${cleanDesc || "(none)"}`;
}

function buildRuleBased(issueType: string, name: string, desc: string, category: string, price: number | undefined, isHe: boolean): string {
  const cleanDesc = desc.replace(/<[^>]+>/g, "").slice(0, 100);
  const priceStr = price ? `₪${price}` : "";
  switch (issueType) {
    case "missing_title": return `${name} | ${category} | BScale`;
    case "missing_meta":  return isHe ? `${name} — ${cleanDesc || category}. קנה עכשיו ב-${priceStr}. משלוח חינם!` : `${name} — ${cleanDesc || category}. Buy now for ${priceStr}. Free shipping!`;
    case "thin_content":  return isHe ? `${name} הוא ${cleanDesc || "מוצר איכותי"} מקטגוריית ${category}. מחיר: ${priceStr}. המוצר כולל אחריות מלאה ומשלוח חינם לכל הארץ.` : `${name} is ${cleanDesc || "a quality product"} from the ${category} category. Price: ${priceStr}. Includes full warranty and free shipping.`;
    case "missing_alt":   return `${name} - ${category}`;
    case "duplicate_meta":return isHe ? `${name} הייחודי שלנו ב-${priceStr} — ${cleanDesc || category}. הזמן עכשיו!` : `Our unique ${name} at ${priceStr} — ${cleanDesc || category}. Order now!`;
    case "weak_slug":     return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 50);
    default: return `${name} — ${cleanDesc}`;
  }
}
