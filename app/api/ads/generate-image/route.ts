import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PLATFORM_SIZES: Record<string, { size: "1024x1024" | "1792x1024" | "1024x1792"; label: string }> = {
  meta: { size: "1024x1024", label: "Square (1:1)" },
  google: { size: "1792x1024", label: "Landscape (16:9)" },
  tiktok: { size: "1024x1792", label: "Vertical (9:16)" },
};

export async function POST(req: NextRequest) {
  const { product, platform, headline, style = "modern", connections } = await req.json();

  const apiKey =
    connections?.openai?.api_key ||
    process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY לא מוגדר — הוסף אותו בחיבורים או ב-.env.local" }, { status: 500 });
  }

  const platformConfig = PLATFORM_SIZES[platform] || PLATFORM_SIZES.meta;
  const productImage = product.images?.[0]?.src || "";
  const category = product.categories?.map((c: any) => c.name).join(", ") || "product";
  const price = product.sale_price || product.price;

  const styleGuide: Record<string, string> = {
    modern: "clean modern minimalist white background, professional product photography style",
    lifestyle: "lifestyle photography, real people using the product, warm natural lighting, authentic feel",
    bold: "bold vibrant colors, high contrast, eye-catching graphic design, dynamic composition",
    luxury: "luxurious premium feel, dark elegant background, soft dramatic lighting, high-end brand aesthetic",
  };

  const prompt = `Professional ${platform} advertisement image for an Israeli e-commerce store.

Product: ${product.name}
Category: ${category}
Price: ₪${price}
${headline ? `Ad headline concept: ${headline}` : ""}

Visual style: ${styleGuide[style] || styleGuide.modern}
Format: ${platformConfig.label} advertisement
Requirements:
- Show the product prominently and attractively
- ${platform === "tiktok" ? "Vertical format optimized for mobile viewing" : platform === "google" ? "Horizontal banner format" : "Square format for feed and stories"}
- Professional advertising quality, no text overlay needed
- Appealing to Israeli consumers
- High quality product showcase

Do NOT include any text, watermarks, or logos in the image.`;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: platformConfig.size,
      quality: "hd",
      style: style === "bold" ? "vivid" : "natural",
    });

    const imageUrl = response.data?.[0]?.url;
    return NextResponse.json({ url: imageUrl, revised_prompt: response.data?.[0]?.revised_prompt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
