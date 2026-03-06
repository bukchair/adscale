import { NextRequest, NextResponse } from "next/server";

export interface WooProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: { id: number; name: string }[];
  images: { src: string; alt: string }[];
  stock_status: string;
  permalink: string;
}

export async function GET(req: NextRequest) {
  const connectionsHeader = req.headers.get("x-connections");
  let woo: Record<string, string> = {};
  try {
    const allConns = JSON.parse(connectionsHeader || "{}");
    woo = allConns.woocommerce || {};
  } catch {}

  const storeUrl = woo.url || process.env.WOOCOMMERCE_URL;
  const consumerKey = woo.consumer_key || process.env.WOOCOMMERCE_KEY;
  const consumerSecret = woo.consumer_secret || process.env.WOOCOMMERCE_SECRET;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    // Return demo products when not connected
    return NextResponse.json({ products: DEMO_PRODUCTS, isDemo: true });
  }

  try {
    const url = new URL(`${storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/products`);
    url.searchParams.set("per_page", "50");
    url.searchParams.set("status", "publish");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64"),
      },
    });

    if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
    const products: WooProduct[] = await res.json();
    return NextResponse.json({ products, isDemo: false });
  } catch (err: any) {
    return NextResponse.json({ products: DEMO_PRODUCTS, isDemo: true, error: err.message });
  }
}

const DEMO_PRODUCTS: WooProduct[] = [
  {
    id: 1,
    name: "נעלי ריצה Pro Air X",
    description: "נעלי ריצה מקצועיות עם כרית אוויר מתקדמת ותמיכה מלאה לקשת הרגל. מתאימות לריצות ארוכות ולמרתוניסטים.",
    short_description: "נעלי ריצה מקצועיות עם טכנולוגיית Air X",
    price: "449",
    regular_price: "549",
    sale_price: "449",
    categories: [{ id: 1, name: "נעליים" }],
    images: [{ src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800", alt: "נעלי ריצה" }],
    stock_status: "instock",
    permalink: "https://example.co.il/product/running-shoes",
  },
  {
    id: 2,
    name: "תיק גב Urban Explorer 30L",
    description: "תיק גב ארגונומי 30 ליטר לעיר ולטיולים. עמיד במים, עם תא למחשב נייד עד 16 אינץ' ו-USB charging port.",
    short_description: "תיק גב 30L עמיד מים עם USB",
    price: "279",
    regular_price: "279",
    sale_price: "",
    categories: [{ id: 2, name: "תיקים" }],
    images: [{ src: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800", alt: "תיק גב" }],
    stock_status: "instock",
    permalink: "https://example.co.il/product/backpack",
  },
  {
    id: 3,
    name: "שעון חכם FitTrack Elite",
    description: "שעון חכם עם מעקב דופק 24/7, GPS, עמידות במים IP68, סוללה ל-7 ימים. מחובר לאנדרואיד ו-iOS.",
    short_description: "שעון חכם GPS עמיד מים, 7 ימי סוללה",
    price: "699",
    regular_price: "899",
    sale_price: "699",
    categories: [{ id: 3, name: "אלקטרוניקה" }],
    images: [{ src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800", alt: "שעון חכם" }],
    stock_status: "instock",
    permalink: "https://example.co.il/product/smartwatch",
  },
  {
    id: 4,
    name: "קפסולת קפה Premium Blend",
    description: "מארז 100 קפסולות קפה Premium Blend, תואם למכונות Nespresso. עוצמה 8/10, ארומה עשירה עם נגיעות שוקולד.",
    short_description: "100 קפסולות קפה Premium, תואם Nespresso",
    price: "89",
    regular_price: "109",
    sale_price: "89",
    categories: [{ id: 4, name: "מזון ומשקאות" }],
    images: [{ src: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800", alt: "קפסולות קפה" }],
    stock_status: "instock",
    permalink: "https://example.co.il/product/coffee",
  },
  {
    id: 5,
    name: "סט טיפוח פנים Natural Glow",
    description: "סט טיפוח פנים שלם עם מוצרים טבעיים: קרם לחות, סרום ויטמין C, וקרם עיניים. ללא פרבנים וצבעים מלאכותיים.",
    short_description: "סט טיפוח פנים טבעי 3 מוצרים",
    price: "199",
    regular_price: "259",
    sale_price: "199",
    categories: [{ id: 5, name: "יופי וטיפוח" }],
    images: [{ src: "https://images.unsplash.com/photo-1556228720-da6f4f579399?w=800", alt: "מוצרי טיפוח" }],
    stock_status: "instock",
    permalink: "https://example.co.il/product/skincare",
  },
];
