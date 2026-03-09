import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export interface SeoSuggestion {
  productId: string;
  title: string;          // Suggested SEO title
  metaDescription: string; // Suggested meta description
  altText: string;        // Suggested image alt text
  score: number;          // Expected SEO score after improvement (0-100)
  tips: string[];         // Extra tips
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { products, lang } = body as {
    products: { id: string; name: string; category: string; description: string; shortDescription: string }[];
    lang?: "he" | "en";
  };

  // Read Gemini credentials from header or body
  const connectionsHeader = req.headers.get("x-connections");
  let geminiApiKey = "";
  let geminiModel = "gemini-2.0-flash";
  try {
    const conns = JSON.parse(connectionsHeader || "{}");
    geminiApiKey = conns.gemini?.api_key || "";
    geminiModel  = conns.gemini?.model   || "gemini-2.0-flash";
  } catch {}

  // Also try env variable
  if (!geminiApiKey) geminiApiKey = process.env.GEMINI_API_KEY ?? "";

  if (!geminiApiKey) {
    return NextResponse.json({ error: "Gemini not connected", suggestions: [] }, { status: 400 });
  }

  if (!products?.length) {
    return NextResponse.json({ suggestions: [] });
  }

  const isHe = lang === "he";
  const langInstruction = isHe
    ? "ענה בעברית. כל התשובות — כותרת, מטא ואלט — חייבות להיות בעברית."
    : "Reply in English.";

  const productList = products.map((p, i) =>
    `${i + 1}. ID=${p.id} | Name: ${p.name} | Category: ${p.category} | Description: ${p.description?.slice(0, 200)} | Short desc: ${p.shortDescription?.slice(0, 100)}`
  ).join("\n");

  const prompt = `You are an expert ecommerce SEO specialist. ${langInstruction}
For each product, generate optimized SEO content and return ONLY valid JSON (no markdown, no explanation).

Given these WooCommerce products, generate SEO improvements for each one.
Return a JSON array with exactly ${products.length} objects, one per product, in this format:
[{"productId":"<id>","title":"<60-70 char SEO title>","metaDescription":"<150-160 char meta description>","altText":"<concise image alt text>","score":<number 70-100>,"tips":["<tip1>","<tip2>"]}]

Products:
${productList}`;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({ model: geminiModel, contents: prompt });
    const raw = (response.text ?? "").trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const suggestions: SeoSuggestion[] = JSON.parse(raw);
    return NextResponse.json({ suggestions });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message, suggestions: [] }, { status: 500 });
  }
}
