import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const PLATFORM_ASPECT: Record<string, { ratio: string; label: string }> = {
  meta:   { ratio: "1:1",  label: "Square (1:1)" },
  google: { ratio: "16:9", label: "Landscape (16:9)" },
  tiktok: { ratio: "9:16", label: "Vertical (9:16)" },
};

const STYLE_BACKGROUNDS: Record<string, string> = {
  modern:    "clean studio white background, professional product photography, soft even lighting, no shadows",
  lifestyle: "warm lifestyle setting, natural environment appropriate for the product, authentic natural lighting",
  bold:      "bold vibrant gradient background, high contrast colors, dynamic eye-catching composition",
  luxury:    "dark elegant background, soft dramatic spotlight lighting, premium luxurious atmosphere",
};

export async function POST(req: NextRequest) {
  const { product, platform, headline, style = "modern", connections } = await req.json();

  const connectionsHeader = req.headers.get("x-connections");
  let conns: Record<string, Record<string, string>> = {};
  try { conns = JSON.parse(connectionsHeader || "{}"); } catch {}

  const apiKey =
    connections?.gemini?.api_key ||
    conns.gemini?.api_key ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "לא הוגדר מפתח Gemini — הוסף אותו בחיבורים" },
      { status: 500 }
    );
  }

  const platformConfig = PLATFORM_ASPECT[platform] || PLATFORM_ASPECT.meta;
  const category = (product.categories || [])
    .map((c: any) => (typeof c === "string" ? c : c.name))
    .join(", ") || "product";
  const price = product.sale_price || product.price;
  const backgroundDesc = STYLE_BACKGROUNDS[style] || STYLE_BACKGROUNDS.modern;

  // Background-only replacement prompt — product must remain unchanged
  const prompt = `Product advertisement photo for ${platform} (${platformConfig.label} format).

CRITICAL INSTRUCTION: You are ONLY changing the background. The product itself must appear EXACTLY as it is — same shape, same colors, same design, same details, no alterations whatsoever to the product.

Product: ${product.name}
Category: ${category}
Price: ₪${price}
${headline ? `Ad concept: ${headline}` : ""}

Background to use: ${backgroundDesc}

Rules:
- The product occupies the center/foreground, unchanged and unchanged
- Only the background, lighting environment, and setting are replaced
- Do NOT add text, logos, watermarks, or price tags
- Do NOT modify, stylize, or reinterpret the product itself
- Professional advertising quality suitable for Israeli e-commerce
- ${platform === "tiktok" ? "Optimized for vertical mobile viewing" : platform === "google" ? "Optimized for horizontal display ads" : "Optimized for feed and stories"}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: platformConfig.ratio as any,
        safetyFilterLevel: "BLOCK_ONLY_HIGH",
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
      return NextResponse.json({ error: "Gemini לא החזיר תמונה" }, { status: 500 });
    }

    const base64 = Buffer.isBuffer(imageBytes)
      ? imageBytes.toString("base64")
      : imageBytes;

    return NextResponse.json({
      url: `data:image/png;base64,${base64}`,
      engine: "gemini-imagen",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
