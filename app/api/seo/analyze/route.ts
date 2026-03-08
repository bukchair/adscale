import { NextRequest, NextResponse } from "next/server";

interface WooProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  categories: { id: number; name: string }[];
  images: { src: string; alt: string }[];
  stock_status: string;
  permalink: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(text: string): number {
  return stripHtml(text).split(/\s+/).filter(Boolean).length;
}

export async function GET(req: NextRequest) {
  const connectionsHeader = req.headers.get("x-connections");
  let woo: Record<string, string> = {};
  try {
    const allConns = JSON.parse(connectionsHeader || "{}");
    woo = allConns.woocommerce || {};
  } catch {}

  const storeUrl   = woo.store_url || woo.url || process.env.WOOCOMMERCE_URL;
  const consumerKey    = woo.consumer_key    || process.env.WOOCOMMERCE_KEY;
  const consumerSecret = woo.consumer_secret || process.env.WOOCOMMERCE_SECRET;

  let products: WooProduct[] = [];
  let isDemo = false;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    isDemo = true;
    products = DEMO_PRODUCTS;
  } else {
    try {
      const url = new URL(`${storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/products`);
      url.searchParams.set("per_page", "50");
      url.searchParams.set("status", "publish");
      const res = await fetch(url.toString(), {
        headers: { Authorization: "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64") },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`WooCommerce ${res.status}`);
      products = await res.json();
    } catch {
      isDemo = true;
      products = DEMO_PRODUCTS;
    }
  }

  const issues: {
    id: string; type: string; severity: "critical" | "high" | "medium" | "low";
    url: string; title: string; titleEn: string; detail: string; detailEn: string;
    suggestion: string; suggestionEn: string; status: "open"; productId: number;
    field: "short_description" | "name" | "alt" | "content" | "slug" | "schema";
  }[] = [];

  const geoPages: {
    url: string; title: string; geoScore: number;
    hasStructuredData: boolean; hasFAQ: boolean; hasSummary: boolean;
    answerReadiness: number; semanticClarity: number; productId: number;
  }[] = [];

  for (const p of products) {
    let relUrl = p.permalink || `/product/${p.id}`;
    try { relUrl = new URL(p.permalink).pathname; } catch {}

    const plainDesc   = stripHtml(p.description);
    const wc          = wordCount(p.description);
    const firstAlt    = p.images[0]?.alt?.trim() ?? "";
    const cat         = p.categories[0]?.name ?? "מוצר";
    const slug        = relUrl.split("/").filter(Boolean).pop() ?? "";

    if (p.name.trim().length < 30) {
      issues.push({
        id: `title_${p.id}`, type: "missing_title", severity: "critical",
        url: relUrl,
        title: `כותרת SEO קצרה: ${p.name}`, titleEn: `Short SEO Title: ${p.name}`,
        detail: `הכותרת "${p.name}" מכילה ${p.name.length} תווים. Google ממליץ על 50-60 תווים.`,
        detailEn: `Title "${p.name}" has ${p.name.length} chars. Google recommends 50-60 chars.`,
        suggestion: `${p.name} | ${cat} | משלוח חינם לכל הארץ`,
        suggestionEn: `${p.name} | ${cat} | Free Shipping Nationwide`,
        status: "open", productId: p.id, field: "name",
      });
    }

    if (p.short_description.trim().length < 50) {
      const autoMeta = plainDesc.slice(0, 155) + (plainDesc.length > 155 ? "…" : "");
      issues.push({
        id: `meta_${p.id}`, type: "missing_meta", severity: "critical",
        url: relUrl,
        title: `חסר תיאור מטא: ${p.name}`, titleEn: `Missing Meta Description: ${p.name}`,
        detail: `"${p.name}" חסר תיאור קצר. תיאורי מטא משפרים CTR בגוגל ב-34%.`,
        detailEn: `"${p.name}" lacks a short description. Meta descriptions improve Google CTR by 34%.`,
        suggestion: autoMeta || `${p.name} — ${cat}. מחיר: ₪${p.price}. משלוח חינם.`,
        suggestionEn: autoMeta || `${p.name} — ${cat}. Price: ₪${p.price}. Free shipping.`,
        status: "open", productId: p.id, field: "short_description",
      });
    }

    if (!firstAlt) {
      issues.push({
        id: `alt_${p.id}`, type: "missing_alt", severity: "high",
        url: relUrl,
        title: `חסר alt text: ${p.name}`, titleEn: `Missing Alt Text: ${p.name}`,
        detail: `התמונה הראשית של "${p.name}" חסרת alt text. פוגע בדירוג גוגל ו-accessibility.`,
        detailEn: `Main image of "${p.name}" is missing alt text. Hurts Google ranking and accessibility.`,
        suggestion: `${p.name} — ${cat}`,
        suggestionEn: `${p.name} — ${cat}`,
        status: "open", productId: p.id, field: "alt",
      });
    }

    if (wc < 100) {
      issues.push({
        id: `content_${p.id}`, type: "thin_content", severity: "high",
        url: relUrl,
        title: `תוכן דל: ${p.name}`, titleEn: `Thin Content: ${p.name}`,
        detail: `עמוד "${p.name}" מכיל ${wc} מילים בלבד. Google מדרג עמודים עם 300+ מילים גבוה יותר.`,
        detailEn: `Page "${p.name}" has only ${wc} words. Google ranks 300+ word pages higher.`,
        suggestion: "הוסף תיאור מפורט, יתרונות, שאלות נפוצות ומפרט טכני.",
        suggestionEn: "Add detailed description, benefits, FAQs and technical specs.",
        status: "open", productId: p.id, field: "content",
      });
    }

    if (/^\d+$/.test(slug) || slug.length < 5) {
      const niceName = p.name.toLowerCase().replace(/[\s]+/g, "-").replace(/[^\w-]/g, "").slice(0, 40);
      issues.push({
        id: `slug_${p.id}`, type: "weak_slug", severity: "medium",
        url: relUrl,
        title: `Slug חלש: ${p.name}`, titleEn: `Weak Slug: ${p.name}`,
        detail: `כתובת "${relUrl}" אינה תיאורית. Google מעדיף URL עם מילות מפתח.`,
        detailEn: `URL "${relUrl}" is not descriptive. Google prefers keyword-rich URLs.`,
        suggestion: `/${niceName}`,
        suggestionEn: `/${niceName}`,
        status: "open", productId: p.id, field: "slug",
      });
    }

    // GEO analysis per product
    const hasFAQ     = plainDesc.includes("?") || plainDesc.toLowerCase().includes("שאלות");
    const hasSummary = p.short_description.trim().length >= 80;
    const answerReadiness = Math.min(100, Math.round(
      Math.min((plainDesc.length / 1200) * 60, 60) +
      (hasFAQ ? 20 : 0) +
      (hasSummary ? 10 : 0) +
      (firstAlt ? 10 : 0)
    ));
    const semanticClarity = Math.min(100, Math.round(
      (p.name.length >= 20 ? 30 : 15) +
      (p.short_description.length >= 50 ? 30 : 10) +
      (firstAlt ? 20 : 5) +
      (wc >= 100 ? 20 : 5)
    ));

    geoPages.push({
      url: relUrl, title: p.name,
      geoScore: Math.round((answerReadiness + semanticClarity) / 2),
      hasStructuredData: false,
      hasFAQ, hasSummary, answerReadiness, semanticClarity,
      productId: p.id,
    });
  }

  const overallScore = Math.max(10, Math.min(95, 95 - issues.length * 7));
  const geoAvg = geoPages.length
    ? Math.round(geoPages.reduce((s, p) => s + p.geoScore, 0) / geoPages.length)
    : 0;

  return NextResponse.json({ issues, geoPages, overallScore, geoScore: geoAvg, productCount: products.length, isDemo });
}

const DEMO_PRODUCTS: WooProduct[] = [
  { id: 1, name: "נעלי ריצה Pro Air X", description: "נעלי ריצה מקצועיות עם כרית אוויר מתקדמת.", short_description: "נעלי ריצה עם Air X", price: "449", categories: [{ id: 1, name: "נעליים" }], images: [{ src: "", alt: "" }], stock_status: "instock", permalink: "https://example.co.il/product/running-shoes" },
  { id: 2, name: "תיק גב Urban Explorer 30L", description: "תיק גב ארגונומי 30 ליטר לעיר ולטיולים.", short_description: "", price: "279", categories: [{ id: 2, name: "תיקים" }], images: [{ src: "", alt: "תיק גב" }], stock_status: "instock", permalink: "https://example.co.il/product/backpack" },
  { id: 3, name: "שעון חכם FitTrack Elite", description: "שעון חכם עם מעקב דופק 24/7, GPS, עמידות במים IP68, סוללה ל-7 ימים. מחובר לאנדרואיד ו-iOS.", short_description: "שעון חכם GPS עמיד מים, 7 ימי סוללה", price: "699", categories: [{ id: 3, name: "אלקטרוניקה" }], images: [{ src: "", alt: "שעון חכם" }], stock_status: "instock", permalink: "https://example.co.il/product/smartwatch" },
  { id: 4, name: "קפה", description: "קפסולות.", short_description: "", price: "89", categories: [{ id: 4, name: "מזון" }], images: [{ src: "", alt: "" }], stock_status: "instock", permalink: "https://example.co.il/product/4" },
  { id: 5, name: "סט טיפוח פנים Natural Glow", description: "סט טיפוח פנים שלם עם מוצרים טבעיים: קרם לחות, סרום ויטמין C, וקרם עיניים. ללא פרבנים וצבעים מלאכותיים. מתאים לכל סוגי העור.", short_description: "סט טיפוח פנים טבעי 3 מוצרים ללא פרבנים", price: "199", categories: [{ id: 5, name: "יופי" }], images: [{ src: "", alt: "מוצרי טיפוח" }], stock_status: "instock", permalink: "https://example.co.il/product/skincare" },
];
