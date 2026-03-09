import { NextRequest, NextResponse } from "next/server";

/**
 * Apply SEO fixes to a WooCommerce product.
 * Supports: short_description (meta), name (title prefix workaround via Yoast meta_data)
 * Note: alt text on images must be updated via the WordPress Media Library API separately.
 */
export async function POST(req: NextRequest) {
  const connectionsHeader = req.headers.get("x-connections");
  let woo: Record<string, string> = {};
  try {
    const allConns = JSON.parse(connectionsHeader || "{}");
    woo = allConns.woocommerce || {};
  } catch {}

  const storeUrl      = woo.store_url || woo.url || process.env.WOOCOMMERCE_URL;
  const consumerKey   = woo.consumer_key    || process.env.WOOCOMMERCE_KEY;
  const consumerSecret = woo.consumer_secret || process.env.WOOCOMMERCE_SECRET;

  const body = await req.json().catch(() => ({})) as {
    productId: number;
    field: "short_description" | "name" | "alt";
    value: string;
  };

  const { productId, field, value } = body;

  if (!productId || !field || !value?.trim()) {
    return NextResponse.json({ error: "productId, field and value are required" }, { status: 400 });
  }

  // If demo mode (no WooCommerce credentials), simulate success
  if (!storeUrl || !consumerKey || !consumerSecret) {
    return NextResponse.json({ success: true, demo: true, message: "Simulated (no WooCommerce connected)" });
  }

  const baseUrl = storeUrl.replace(/\/$/, "");
  const authHeader = "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    if (field === "alt") {
      // Get product to retrieve images array
      const productRes = await fetch(`${baseUrl}/wp-json/wc/v3/products/${productId}`, {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(6000),
      });
      if (!productRes.ok) throw new Error(`Get product ${productRes.status}`);
      const productData = await productRes.json();
      const images: { id: number; src: string; alt: string }[] = productData.images ?? [];
      if (!images.length) {
        return NextResponse.json({ success: false, error: "No image found on product" });
      }
      // Update alt text via WooCommerce images field (uses wc/v3 auth — no 401)
      const updatedImages = images.map((img, i) =>
        i === 0 ? { ...img, alt: value } : img
      );
      const updateRes = await fetch(`${baseUrl}/wp-json/wc/v3/products/${productId}`, {
        method: "PUT",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ images: updatedImages }),
        signal: AbortSignal.timeout(8000),
      });
      if (!updateRes.ok) {
        const txt = await updateRes.text();
        throw new Error(`WooCommerce ${updateRes.status}: ${txt.slice(0, 200)}`);
      }
      return NextResponse.json({ success: true, field: "alt", productId });
    }

    // For short_description or name — update product directly
    const payload: Record<string, unknown> = {};
    if (field === "short_description") payload.short_description = value;
    if (field === "name") {
      // Also write to Yoast SEO title meta so the <title> tag changes
      payload.meta_data = [
        { key: "_yoast_wpseo_title", value },
        { key: "rank_math_title",    value }, // RankMath fallback
      ];
    }

    const updateRes = await fetch(`${baseUrl}/wp-json/wc/v3/products/${productId}`, {
      method: "PUT",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!updateRes.ok) {
      const txt = await updateRes.text();
      throw new Error(`WooCommerce ${updateRes.status}: ${txt.slice(0, 200)}`);
    }
    return NextResponse.json({ success: true, field, productId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 });
  }
}
