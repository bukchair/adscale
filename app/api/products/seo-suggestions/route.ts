import { NextRequest, NextResponse } from "next/server";

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

  // Read OpenAI credentials from header
  const connectionsHeader = req.headers.get("x-connections");
  let openaiApiKey = "";
  let openaiModel = "gpt-4o";
  try {
    const conns = JSON.parse(connectionsHeader || "{}");
    openaiApiKey = conns.openai?.api_key || "";
    openaiModel  = conns.openai?.model || "gpt-4o";
  } catch {}

  if (!openaiApiKey) {
    return NextResponse.json({ error: "OpenAI not connected", suggestions: [] }, { status: 400 });
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

  const systemPrompt = `You are an expert ecommerce SEO specialist. ${langInstruction}
For each product, generate optimized SEO content and return ONLY valid JSON (no markdown, no explanation).`;

  const userPrompt = `Given these WooCommerce products, generate SEO improvements for each one.
Return a JSON array with exactly ${products.length} objects, one per product, in this format:
[{"productId":"<id>","title":"<60-70 char SEO title>","metaDescription":"<150-160 char meta description>","altText":"<concise image alt text>","score":<number 70-100>,"tips":["<tip1>","<tip2>"]}]

Products:
${productList}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `OpenAI error: ${res.status} ${err}`, suggestions: [] }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "[]";

    // Strip potential markdown fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const suggestions: SeoSuggestion[] = JSON.parse(cleaned);
    return NextResponse.json({ suggestions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, suggestions: [] }, { status: 500 });
  }
}
