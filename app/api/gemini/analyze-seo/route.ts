import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini SEO analysis endpoint.
 * POST body: {
 *   product: { name, shortDescription, longDescription, images: [{src,alt}], categories, price, sku },
 *   issueType: string,
 *   lang: "he" | "en",
 *   connections: { gemini?: { api_key, model } }
 * }
 */
export async function POST(req: NextRequest) {
  const connectionsHeader = req.headers.get("x-connections");
  let conns: Record<string, Record<string, string>> = {};
  try { conns = JSON.parse(connectionsHeader || "{}"); } catch {}

  const body = await req.json().catch(() => ({})) as {
    product?: {
      name: string;
      shortDescription?: string;
      longDescription?: string;
      images?: { src: string; alt: string; id?: number }[];
      categories?: string[];
      price?: number;
      sku?: string;
    };
    issueType?: string;
    lang?: "he" | "en";
    connections?: Record<string, Record<string, string>>;
  };

  const apiKey =
    body.connections?.gemini?.api_key ||
    conns.gemini?.api_key ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY לא מוגדר", demo: true }, { status: 400 });
  }

  const { product = { name: "" }, issueType = "missing_meta", lang = "he" } = body;
  const model = body.connections?.gemini?.model || conns.gemini?.model || "gemini-2.0-flash";
  const isHe = lang === "he";

  const productContext = buildProductContext(product, isHe);
  const prompt = buildSeoPrompt(issueType, productContext, isHe);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    const text = (response.text ?? "").trim().replace(/^["'`]+|["'`]+$/g, "");
    return NextResponse.json({ suggestion: text, field: issueTypeToField(issueType), engine: "gemini" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function issueTypeToField(issueType: string): string {
  const map: Record<string, string> = {
    missing_title: "name",
    missing_meta: "short_description",
    missing_alt: "alt",
    thin_content: "short_description",
    duplicate_meta: "short_description",
    weak_slug: "slug",
    no_schema: "schema",
  };
  return map[issueType] ?? "short_description";
}

function buildProductContext(
  product: { name: string; shortDescription?: string; longDescription?: string; images?: { src: string; alt: string }[]; categories?: string[]; price?: number; sku?: string },
  isHe: boolean
): string {
  const lines = [
    isHe ? `שם מוצר: ${product.name}` : `Product name: ${product.name}`,
  ];
  if (product.categories?.length) lines.push(isHe ? `קטגוריות: ${product.categories.join(", ")}` : `Categories: ${product.categories.join(", ")}`);
  if (product.price) lines.push(isHe ? `מחיר: ₪${product.price}` : `Price: ₪${product.price}`);
  if (product.sku) lines.push(`SKU: ${product.sku}`);
  if (product.shortDescription) lines.push(isHe ? `תיאור קצר: ${product.shortDescription.slice(0, 300)}` : `Short description: ${product.shortDescription.slice(0, 300)}`);
  if (product.longDescription) lines.push(isHe ? `תיאור מלא: ${product.longDescription.slice(0, 500)}` : `Long description: ${product.longDescription.slice(0, 500)}`);
  if (product.images?.length) {
    const imgList = product.images.map(img => `${img.src} (alt: "${img.alt}")`).join("\n  ");
    lines.push(isHe ? `תמונות:\n  ${imgList}` : `Images:\n  ${imgList}`);
  }
  return lines.join("\n");
}

function buildSeoPrompt(issueType: string, context: string, isHe: boolean): string {
  const tasks: Record<string, string> = {
    missing_title: isHe
      ? `כתוב כותרת SEO אופטימלית (40-60 תווים) שתגדיל CTR בתוצאות החיפוש. כלול את שם המוצר ומילת מפתח חזקה. החזר רק את הכותרת.`
      : `Write an optimal SEO title (40-60 chars) that maximizes CTR in search results. Include product name and a strong keyword. Return only the title.`,
    missing_meta: isHe
      ? `כתוב תיאור meta SEO (120-155 תווים) שיגדיל CTR. כלול יתרון ברור, מילת מפתח ו-CTA. החזר רק את התיאור.`
      : `Write an SEO meta description (120-155 chars) that maximizes CTR. Include a clear benefit, keyword, and CTA. Return only the description.`,
    thin_content: isHe
      ? `כתוב תיאור קצר מקצועי ל-WooCommerce (80-160 מילים) עם מילות מפתח, יתרונות ו-USP. כלול כותרות H2 אם מתאים. החזר רק את הטקסט.`
      : `Write a professional WooCommerce short description (80-160 words) with keywords, benefits and USP. Include H2 headers if relevant. Return only the text.`,
    missing_alt: isHe
      ? `כתוב טקסט alt SEO (עד 125 תווים) לתמונות המוצר. כלול שם המוצר, תכונות עיקריות ומילת מפתח. אם יש מספר תמונות, כתוב alt לכל אחת בנפרד בשורה נפרדת.`
      : `Write SEO alt text (up to 125 chars) for product images. Include product name, key attributes and keyword. If multiple images exist, write one alt per line.`,
    duplicate_meta: isHe
      ? `כתוב תיאור meta ייחודי (120-155 תווים) שמבדיל מוצר זה מהמתחרים בחנות. השתמש ב-USP ייחודי. החזר רק את התיאור.`
      : `Write a unique meta description (120-155 chars) differentiating this product from store competitors. Use a unique USP. Return only the description.`,
    weak_slug: isHe
      ? `צור slug URL SEO אופטימלי באנגלית (מילות קטנות עם מקפים, 3-6 מילים). לדוגמה: premium-running-shoes-pro. החזר רק את ה-slug.`
      : `Create an SEO-optimal URL slug (lowercase hyphenated, 3-6 words). E.g., premium-running-shoes-pro. Return only the slug.`,
    no_schema: isHe
      ? `צור JSON-LD schema.org/Product מלא עבור המוצר. כלול: name, description, image, price, priceCurrency, availability, sku. החזר רק JSON תקין.`
      : `Create a complete JSON-LD schema.org/Product for this product. Include: name, description, image, price, priceCurrency, availability, sku. Return only valid JSON.`,
  };

  const task = tasks[issueType] ?? tasks.missing_meta;
  return isHe
    ? `אתה מומחה SEO ל-WooCommerce בישראל. ${task}\n\nפרטי המוצר:\n${context}`
    : `You are a WooCommerce SEO expert. ${task}\n\nProduct details:\n${context}`;
}
