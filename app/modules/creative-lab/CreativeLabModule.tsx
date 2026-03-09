"use client";
import { useState, useEffect, useRef } from "react";
import { C } from "../theme";
import { getConnections } from "../../lib/auth";
import type { Lang } from "../page";

/* ── Types ──────────────────────────────────────────────────────── */
type Platform = "meta" | "google" | "tiktok";
type AdFormat = "story" | "feed" | "reel" | "search" | "display" | "shopping";
type GenTab = "text" | "image";

interface WCProduct {
  id: string; name: string; nameEn: string; price: number;
  category: string; categoryEn: string; image: string;
  description: string; descriptionEn: string; sku: string;
  // WooCommerce raw fields (used for AI APIs)
  short_description?: string;
  longDescription?: string;
  regular_price?: string;
  sale_price?: string;
  categories?: { id: number; name: string }[];
  images?: { src: string; alt: string; id?: number }[];
}
interface AdVariant { headline: string; body: string; cta: string; score: number; }

/* ── Data ───────────────────────────────────────────────────────── */
const WC_PRODUCTS: WCProduct[] = [
  { id:"1", name:"נעלי ריצה X1 מקצועיות", nameEn:"Running Shoes X1 Pro", price:299, category:"נעלי ריצה", categoryEn:"Running Shoes", image:"👟", description:"נעלי ריצה מקצועיות עם בולעי זעזועים מתקדמים, סוליה קלה ועמידה.", descriptionEn:"Professional running shoes with advanced shock absorbers, lightweight durable sole.", sku:"RS-X1-001" },
  { id:"2", name:"נעלי ריצה X2 אולטרה",   nameEn:"Running Shoes X2 Ultra", price:449, category:"נעלי ריצה", categoryEn:"Running Shoes", image:"👟", description:"נעלי ריצה פרמיום לריצות ארוכות, ריפוד מקסימלי.", descriptionEn:"Premium long-distance running shoes with maximum cushioning.", sku:"RS-X2-001" },
  { id:"3", name:"גרביים לריצה 3 זוגות",  nameEn:"Running Socks 3-Pack",   price:89,  category:"אביזרים", categoryEn:"Accessories", image:"🧦", description:"גרביים מקצועיות נושמות לריצה, 3 זוגות בסט.", descriptionEn:"Professional breathable running socks, 3-pack set.", sku:"SK-RUN-3P" },
  { id:"4", name:"חגורת ריצה עם כיסים",   nameEn:"Running Belt w/ Pockets", price:129, category:"אביזרים", categoryEn:"Accessories", image:"🎽", description:"חגורת ריצה עם 3 כיסים, אידיאלית לריצות ארוכות.", descriptionEn:"Running belt with 3 pockets, ideal for long runs.", sku:"BT-RUN-001" },
  { id:"5", name:"בקבוק מים ספורטיבי",    nameEn:"Sports Water Bottle",     price:59,  category:"אביזרים", categoryEn:"Accessories", image:"🍶", description:"בקבוק מים 750ml, ידית נוחה, חסין אצבעות.", descriptionEn:"750ml water bottle, ergonomic handle, leak-proof.", sku:"WB-SPT-001" },
  { id:"6", name:"אוזניות ספורט אלחוטיות",nameEn:"Wireless Sport Earbuds",  price:199, category:"טכנולוגיה", categoryEn:"Tech", image:"🎧", description:"אוזניות Bluetooth ספורטיביות עמידות למים, סוללה 8 שעות.", descriptionEn:"Waterproof Bluetooth sport earbuds, 8-hour battery.", sku:"EP-SPT-BT" },
];

const PLATFORMS: { id: Platform; label: string; icon: string; color: string }[] = [
  { id:"meta",   label:"Meta",   icon:"📘", color:"#1877f2" },
  { id:"google", label:"Google", icon:"🔍", color:"#4285f4" },
  { id:"tiktok", label:"TikTok", icon:"🎵", color:"#010101" },
];

const FORMATS: Record<Platform, { id: AdFormat; he: string; en: string }[]> = {
  meta:   [{ id:"feed",    he:"פיד",    en:"Feed"     }, { id:"story",    he:"Story",   en:"Story"    }, { id:"reel",    he:"Reel",    en:"Reel"    }],
  google: [{ id:"search",  he:"Search", en:"Search"   }, { id:"display",  he:"Display", en:"Display"  }, { id:"shopping",he:"Shopping",en:"Shopping"}],
  tiktok: [{ id:"feed",    he:"פיד",    en:"Feed"     }, { id:"story",    he:"TopView", en:"TopView"  }, { id:"reel",    he:"Spark",   en:"Spark"   }],
};

function generateVariants(p: WCProduct, platform: Platform, lang: Lang): AdVariant[] {
  const n = lang==="he" ? p.name : p.nameEn;
  const desc = lang==="he" ? p.description : p.descriptionEn;
  if (platform==="meta") return [
    { headline: lang==="he" ? `${n} — משנה את הריצה שלך` : `${n} — Change Your Run`, body: lang==="he" ? `עם ₪${p.price} בלבד. ${desc} משלוח חינם 🚚` : `For only ₪${p.price}. ${desc} Free shipping 🚚`, cta: lang==="he" ? "קנה עכשיו" : "Shop Now", score:91 },
    { headline: lang==="he" ? `מדוע 10,000 רצים בחרו ב-${n}?` : `Why 10,000 runners chose ${n}?`, body: lang==="he" ? `${desc} רק ₪${p.price}. 30 יום החזרה חינם.` : `${desc} Only ₪${p.price}. 30-day returns.`, cta: lang==="he" ? "גלה עכשיו" : "Discover Now", score:87 },
    { headline: lang==="he" ? `מבצע מוגבל — ${n}` : `Limited Offer — ${n}`, body: lang==="he" ? `קנה היום ב-₪${p.price} וקבל משלוח אקספרס חינם. מלאי מוגבל!` : `Buy today for ₪${p.price}, get free express shipping. Limited stock!`, cta: lang==="he" ? "אחז את הדיל" : "Grab the Deal", score:84 },
  ];
  if (platform==="google") return [
    { headline: lang==="he" ? `${n} | ₪${p.price} | משלוח חינם` : `${n} | ₪${p.price} | Free Shipping`, body: lang==="he" ? `${desc} קנה עכשיו. החזרה 30 יום.` : `${desc} Buy now. 30-day returns.`, cta: lang==="he" ? "קנה עכשיו" : "Shop Now", score:89 },
    { headline: lang==="he" ? `קנה ${n} | מחיר מיוחד` : `Buy ${n} | Special Price`, body: lang==="he" ? `החל מ-₪${p.price}. משלוח מהיר לכל הארץ.` : `From ₪${p.price}. Fast delivery nationwide.`, cta: lang==="he" ? "קנה עכשיו" : "Buy Now", score:85 },
    { headline: lang==="he" ? `${n} הכי זול ברשת` : `${n} Best Price Online`, body: lang==="he" ? `השווה ותראה — ₪${p.price}. ${desc}` : `Compare and see — ₪${p.price}. ${desc}`, cta: lang==="he" ? "ראה עכשיו" : "See Now", score:81 },
  ];
  return [
    { headline: lang==="he" ? `POV: גילית את ה-${n} 👟` : `POV: You just found ${n} 👟`, body: lang==="he" ? `₪${p.price} בלבד. ${desc} לינק בביו ✨` : `Only ₪${p.price}. ${desc} Link in bio ✨`, cta: lang==="he" ? "הזמן עכשיו" : "Order Now", score:93 },
    { headline: lang==="he" ? `#ריצה ${n}` : `#running ${n}`, body: lang==="he" ? `החיים קצרים מדי לציוד גרוע 🔥 ${desc} ₪${p.price}` : `Life's too short for bad gear 🔥 ${desc} ₪${p.price}`, cta: lang==="he" ? "קנה עכשיו" : "Buy Now", score:90 },
    { headline: lang==="he" ? `זה מה שחסר לאימון שלך` : `This is what your workout is missing`, body: lang==="he" ? `${desc} רק ₪${p.price} ⚡` : `${desc} Just ₪${p.price} ⚡`, cta: lang==="he" ? "גלה עוד" : "Learn More", score:86 },
  ];
}

function generateImagePrompt(p: WCProduct, platform: Platform, format: AdFormat): string {
  const styles: Record<Platform, string> = {
    meta:   "clean product photography, lifestyle, bright studio, white background, social media ad",
    google: "professional product shot, clean white background, e-commerce style, high resolution",
    tiktok: "vibrant lifestyle photography, dynamic, trendy color palette, vertical 9:16",
  };
  return `${p.nameEn} — ${styles[platform]}, ${format==="story"||format==="reel" ? "vertical 9:16" : "square 1:1"}, premium, photorealistic`;
}

/* ── Ad Previews ────────────────────────────────────────────────── */
function MetaPreview({ p, v, lang }: { p: WCProduct; v: AdVariant; lang: Lang }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", maxWidth:360, margin:"0 auto" }}>
      <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🛍️</div>
        <div><div style={{ fontSize:13, fontWeight:700, color:C.text }}>BScale Store</div><div style={{ fontSize:10, color:C.textMuted }}>{lang==="he"?"ממומן":"Sponsored"}</div></div>
      </div>
      <div style={{ padding:"0 14px 10px", fontSize:13, color:C.text, lineHeight:1.5 }}>{v.body}</div>
      <div style={{ height:220, background:`linear-gradient(135deg,${C.accentLight},${C.purpleLight})`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
        <span style={{ fontSize:56 }}>{p.image}</span>
        <div style={{ fontSize:12, color:C.textSub, fontWeight:600 }}>{lang==="he"?p.name:p.nameEn}</div>
      </div>
      <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:12, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.headline}</div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text }}>₪{p.price}</div>
        </div>
        <button style={{ padding:"7px 14px", background:"#1877f2", color:"#fff", border:"none", borderRadius:6, fontWeight:700, fontSize:12, cursor:"pointer", flexShrink:0 }}>{v.cta}</button>
      </div>
    </div>
  );
}

function GooglePreview({ p, v, lang }: { p: WCProduct; v: AdVariant; lang: Lang }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${C.border}`, padding:20, maxWidth:560, margin:"0 auto" }}>
      <div style={{ fontSize:11, color:"#188038", marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ background:"#188038", color:"#fff", fontSize:9, fontWeight:700, padding:"1px 4px", borderRadius:2 }}>Ad</span>
        <span>store.co.il › {lang==="he"?p.category:p.categoryEn}</span>
      </div>
      <div style={{ fontSize:17, color:"#1a0dab", fontWeight:500, marginBottom:4, lineHeight:1.3 }}>{v.headline}</div>
      <div style={{ fontSize:13, color:"#4d5156", lineHeight:1.5 }}>{v.body}</div>
    </div>
  );
}

function TikTokPreview({ p, v, lang }: { p: WCProduct; v: AdVariant; lang: Lang }) {
  return (
    <div style={{ background:"#010101", borderRadius:16, overflow:"hidden", maxWidth:200, margin:"0 auto", position:"relative", height:360 }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#1a1a2e,#16213e)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
        <span style={{ fontSize:56 }}>{p.image}</span>
        <div style={{ fontSize:11, color:"#aaa", fontWeight:600, textAlign:"center", padding:"0 12px" }}>{lang==="he"?p.name:p.nameEn}</div>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px 12px 14px", background:"linear-gradient(transparent,rgba(0,0,0,0.85))" }}>
        <div style={{ fontSize:12, color:"#fff", fontWeight:700, marginBottom:4 }}>{v.headline}</div>
        <div style={{ fontSize:10, color:"#ccc", marginBottom:8, lineHeight:1.4 }}>{v.body.slice(0,70)}…</div>
        <button style={{ padding:"6px 14px", background:"#ff0050", color:"#fff", border:"none", borderRadius:4, fontWeight:700, fontSize:11, cursor:"pointer" }}>{v.cta}</button>
      </div>
    </div>
  );
}

/* ── Step bar ────────────────────────────────────────────────────── */
function StepBar({ step, lang }: { step: number; lang: Lang }) {
  const steps = [{ n:1,he:"מוצר",en:"Product"},{n:2,he:"פלטפורמה",en:"Platform"},{n:3,he:"יצירה",en:"Generate"},{n:4,he:"פרסום",en:"Publish"}];
  return (
    <div className="as-wizard-steps" style={{ marginBottom:20 }}>
      {steps.map((s,i) => (
        <div key={s.n} style={{ flex:1, padding:"13px 8px", textAlign:"center", background:step===s.n?C.accent:step>s.n?C.green:C.card, color:step>=s.n?"#fff":C.textMuted, fontSize:13, fontWeight:600, borderRight:i<3?`1px solid ${C.border}`:"none", transition:"all 0.2s" }}>
          <div style={{ fontSize:16, marginBottom:2 }}>{step>s.n?"✓":s.n}</div>
          <div style={{ fontSize:11 }}>{lang==="he"?s.he:s.en}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function CreativeLabModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang==="he" ? he : en;
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState<WCProduct | null>(null);
  const [platform, setPlatform] = useState<Platform>("meta");
  const [format, setFormat] = useState<AdFormat>("feed");
  const [genTab, setGenTab] = useState<GenTab>("text");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [chosen, setChosen] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgDone, setImgDone] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgPrompt, setImgPrompt] = useState("");
  const [tone, setTone] = useState<"enthusiastic" | "professional" | "playful">("enthusiastic");

  // WooCommerce products
  const [products, setProducts] = useState<WCProduct[]>(WC_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const loadingRef = useRef(false);

  function getConnHeaders(): Record<string, string> {
    const conns = getConnections();
    return {
      "x-connections": JSON.stringify({
        woocommerce: conns.woocommerce?.fields ?? {},
        gemini:      conns.gemini?.fields      ?? {},
        anthropic:   conns.anthropic?.fields   ?? {},
        openai:      conns.openai?.fields      ?? {},
      }),
    };
  }

  function activeAiLabel(): string {
    const conns = getConnections();
    if (conns.gemini?.fields?.api_key) return lang === "he" ? "Gemini AI" : "Gemini AI";
    if (conns.anthropic?.fields?.api_key) return "Claude AI";
    return lang === "he" ? "AI" : "AI";
  }

  // Load real WooCommerce products on mount + on connection change
  async function loadProducts() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/woocommerce/products", { headers: getConnHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIsDemo(data.isDemo ?? true);
      if (Array.isArray(data.products) && data.products.length > 0) {
        // Map WooCommerce API products to WCProduct shape
        const mapped: WCProduct[] = data.products.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          nameEn: p.name,
          price: parseFloat(p.price || p.regular_price || "0"),
          category: p.categories?.[0]?.name ?? "",
          categoryEn: p.categories?.[0]?.name ?? "",
          image: p.images?.[0]?.src ? "🛍️" : "🛍️", // use emoji as placeholder
          description: p.description?.replace(/<[^>]+>/g, "").slice(0, 200) ?? "",
          descriptionEn: p.description?.replace(/<[^>]+>/g, "").slice(0, 200) ?? "",
          sku: p.sku ?? "",
          short_description: p.short_description?.replace(/<[^>]+>/g, "") ?? "",
          regular_price: p.regular_price,
          sale_price: p.sale_price,
          categories: p.categories,
        }));
        setProducts(mapped);
      }
    } catch {
      // Keep demo products on error
    } finally {
      setLoadingProducts(false);
      loadingRef.current = false;
    }
  }

  useEffect(() => {
    loadProducts();
    const handler = () => loadProducts();
    window.addEventListener("bscale:connections-changed", handler);
    return () => window.removeEventListener("bscale:connections-changed", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate ad copy via Claude API
  const doGenerate = async () => {
    if (!product) return;
    setGenerating(true);
    setGenError(null);
    try {
      const conns = getConnections();
      const res = await fetch("/api/ads/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            name: lang === "he" ? product.name : product.nameEn,
            short_description: product.short_description || product.description,
            description: product.description,
            price: product.price,
            regular_price: product.regular_price ?? String(product.price),
            sale_price: product.sale_price ?? "",
            categories: product.categories ?? [{ id: 1, name: product.category }],
          },
          platform,
          lang,
          tone,
          connections: {
            gemini:    conns.gemini?.fields    ?? {},
            anthropic: conns.anthropic?.fields ?? {},
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const vars: AdVariant[] = (data.variations ?? []).map((v: any, i: number) => ({
        headline: v.headline ?? "",
        body: `${v.emoji ?? ""} ${v.description ?? ""}`.trim(),
        cta: v.cta ?? "",
        score: 95 - i * 4,
      }));
      if (vars.length === 0) throw new Error("No variants returned");
      setVariants(vars);
      setStep(4);
    } catch (e: any) {
      // Fallback to local generation
      setVariants(generateVariants(product, platform, lang));
      setGenError(e.message?.includes("API") ? e.message : null);
      setStep(4);
    } finally {
      setGenerating(false);
    }
  };

  const doPublish = async () => {
    setPublishing(true);
    await new Promise(r => setTimeout(r, 1400));
    setPublishing(false);
    setPublished(true);
  };

  // Generate image via OpenAI DALL·E
  const doGenerateImage = async () => {
    if (!product) return;
    setImgGenerating(true);
    setImgUrl(null);
    try {
      const conns = getConnections();
      const res = await fetch("/api/ads/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            name: lang === "he" ? product.name : product.nameEn,
            price: String(product.price),
            sale_price: product.sale_price ?? "",
            categories: product.categories ?? [{ id: 1, name: product.categoryEn }],
            images: [],
          },
          platform,
          style: "modern",
          connections: { gemini: conns.gemini?.fields ?? {} },
        }),
      });
      const data = await res.json();
      if (data.url) setImgUrl(data.url);
    } catch {}
    finally {
      setImgGenerating(false);
      setImgDone(true);
    }
  };

  const pl = PLATFORMS.find(p => p.id===platform)!;

  return (
    <div>
      <StepBar step={step} lang={lang} />

      {/* ── Step 1: Product selection ───────────────────────────── */}
      {step===1 && (
        <div className="as-card" style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.text }}>🛍️ {t("בחר מוצר מ-WooCommerce","Select WooCommerce Product")}</div>
            {isDemo && <span style={{ fontSize:11, background:C.amberLight, color:C.amberText, padding:"3px 10px", borderRadius:20, fontWeight:600 }}>⚠️ {t("דמו — חבר WooCommerce","Demo — Connect WooCommerce")}</span>}
            {!isDemo && <span style={{ fontSize:11, background:C.greenLight, color:C.greenText, padding:"3px 10px", borderRadius:20, fontWeight:600 }}>✅ {t("מוצרים אמיתיים","Live products")}</span>}
          </div>
          <div style={{ fontSize:13, color:C.textMuted, marginBottom:20 }}>{t("המערכת תשתמש בפרטי המוצר ליצירת מודעות מותאמות עם Gemini AI","Product data will be used to create tailored ads with Gemini AI")}</div>
          {loadingProducts ? (
            <div style={{ textAlign:"center", padding:30, color:C.textMuted, fontSize:13 }}>
              <div style={{ width:24, height:24, border:`2px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }} />
              {t("טוען מוצרים...","Loading products...")}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {products.map(p => (
                <button key={p.id} onClick={() => { setProduct(p); setImgPrompt(generateImagePrompt(p, platform, format)); setStep(2); }} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", border:`2px solid ${C.border}`, borderRadius:10, background:C.card, cursor:"pointer", textAlign:"start", transition:"all 0.15s" }}>
                  <div style={{ width:40, height:40, borderRadius:8, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{p.image}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{lang==="he"?p.name:p.nameEn}</div>
                    <div style={{ fontSize:11, color:C.textMuted }}>{lang==="he"?p.category:p.categoryEn}{p.sku ? ` · ${p.sku}` : ""} · <span style={{ color:C.green, fontWeight:600 }}>₪{p.price}</span></div>
                  </div>
                  <span style={{ color:C.accent }}>›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Platform + format ───────────────────────────── */}
      {step===2 && product && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* product recap */}
          <div className="as-card" style={{ padding:12, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:24 }}>{product.image}</span>
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.text }}>{lang==="he"?product.name:product.nameEn}</div><div style={{ fontSize:11, color:C.textMuted }}>₪{product.price}</div></div>
            <button onClick={()=>setStep(1)} style={{ fontSize:12, color:C.accent, background:"none", border:"none", cursor:"pointer" }}>{t("שנה","Change")}</button>
          </div>

          <div className="as-card" style={{ padding:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:18 }}>📱 {t("בחר פלטפורמה ופורמט","Choose Platform & Format")}</div>

            <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>{t("פלטפורמה","Platform")}</div>
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {PLATFORMS.map(pl => (
                <button key={pl.id} onClick={() => { setPlatform(pl.id); setFormat(FORMATS[pl.id][0].id); }} style={{ flex:1, minWidth:80, display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"12px 8px", borderRadius:10, border:`2px solid ${platform===pl.id?pl.color:C.border}`, background:platform===pl.id?`${pl.color}11`:C.card, cursor:"pointer", fontSize:12, fontWeight:700, color:platform===pl.id?pl.color:C.textSub, transition:"all 0.15s" }}>
                  <span style={{ fontSize:22 }}>{pl.icon}</span>{pl.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>{t("פורמט","Format")}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
              {FORMATS[platform].map(f => (
                <button key={f.id} onClick={()=>setFormat(f.id)} style={{ padding:"7px 16px", borderRadius:20, border:`1px solid ${format===f.id?C.accent:C.border}`, background:format===f.id?C.accentLight:C.card, color:format===f.id?C.accent:C.textSub, cursor:"pointer", fontSize:13, fontWeight:600 }}>{lang==="he"?f.he:f.en}</button>
              ))}
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>{t("סוג יצירה","Generator Type")}</div>
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {(["text","image"] as const).map(tab => (
                <button key={tab} onClick={()=>setGenTab(tab)} style={{ flex:1, minWidth:130, padding:"10px 16px", borderRadius:8, border:`2px solid ${genTab===tab?C.accent:C.border}`, background:genTab===tab?C.accent:C.card, color:genTab===tab?"#fff":C.textSub, cursor:"pointer", fontSize:13, fontWeight:700 }}>
                  {tab==="text"?`✍️ ${t("מחולל טקסט","Text Generator")}` : `🎨 ${t("מחולל תמונה","Image Generator")}`}
                </button>
              ))}
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setStep(1)} style={{ padding:"10px 18px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer", fontWeight:600 }}>← {t("חזור","Back")}</button>
              <button onClick={()=>setStep(3)} style={{ flex:1, padding:"10px 18px", borderRadius:8, border:"none", background:C.accent, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:14 }}>{t("המשך","Continue")} →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Generate ─────────────────────────────────────── */}
      {step===3 && product && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="as-card" style={{ padding:12, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:22 }}>{product.image}</span>
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.text }}>{lang==="he"?product.name:product.nameEn}</div><div style={{ fontSize:11, color:C.textMuted }}>{pl.label} · {format}</div></div>
            <button onClick={()=>setStep(2)} style={{ fontSize:12, color:C.accent, background:"none", border:"none", cursor:"pointer" }}>{t("שנה","Change")}</button>
          </div>

          {genTab==="text" && (
            <div className="as-card" style={{ padding:24 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>✍️ {t("מחולל טקסט מודעה","Ad Text Generator")}</div>
              <div style={{ fontSize:13, color:C.textMuted, marginBottom:20 }}>{t("Gemini AI יייצר 3 גרסאות מודעה בהתאם למוצר ולפלטפורמה","Gemini AI will create 3 ad variants tailored to the product and platform")}</div>
              {/* Tone selector */}
              <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>{t("סגנון כתיבה","Writing Tone")}</div>
              <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
                {([["enthusiastic", t("נלהב 🔥","Enthusiastic 🔥")], ["professional", t("מקצועי 💼","Professional 💼")], ["playful", t("שובב 😄","Playful 😄")]] as const).map(([val, label]) => (
                  <button key={val} onClick={()=>setTone(val)} style={{ padding:"7px 16px", borderRadius:20, border:`1px solid ${tone===val?C.accent:C.border}`, background:tone===val?C.accentLight:C.card, color:tone===val?C.accent:C.textSub, cursor:"pointer", fontSize:13, fontWeight:600 }}>{label}</button>
                ))}
              </div>
              <div style={{ textAlign:"center" }}>
                <button onClick={doGenerate} disabled={generating} style={{ padding:"13px 32px", borderRadius:10, border:"none", background:generating?C.border:`linear-gradient(135deg,${C.accent},${C.purple})`, color:generating?C.textMuted:"#fff", cursor:generating?"not-allowed":"pointer", fontWeight:700, fontSize:15, boxShadow:C.shadowMd }}>
                  {generating ? `⏳ ${t("מייצר עם Gemini AI...","Generating with Gemini AI...")}` : `🤖 ${t("צור 3 גרסאות","Generate 3 Variants")}`}
                </button>
                {genError && <div style={{ marginTop:10, fontSize:12, color:C.amber }}>⚠️ {genError} — {t("נוצרו גרסאות מקומיות","Local variants used")}</div>}
                {generating && (
                  <div style={{ marginTop:20, display:"inline-flex", flexDirection:"column", gap:6, textAlign:"start" }}>
                    {[t("ניתוח פרטי מוצר...","Analyzing product..."), t("שולח ל-Gemini AI...","Sending to Gemini AI..."), t("מייצר גרסאות...","Generating variants...")].map((msg,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.textSub }}><div style={{ width:6, height:6, borderRadius:"50%", background:C.green }} />{msg}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {genTab==="image" && (
            <div className="as-card" style={{ padding:20 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>🎨 {t("מחולל תמונה","Image Generator")}</div>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, marginBottom:6 }}>{t("פרומפט AI (ניתן לעריכה)","AI Prompt (editable)")}</div>
              <textarea value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} rows={3} style={{ width:"100%", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:C.inputBg, color:C.text, fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box", marginBottom:12 }} />
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
                <button onClick={doGenerateImage} disabled={imgGenerating} style={{ padding:"10px 22px", borderRadius:8, border:"none", background:imgGenerating?C.border:`linear-gradient(135deg,${C.accent},${C.purple})`, color:imgGenerating?C.textMuted:"#fff", cursor:imgGenerating?"not-allowed":"pointer", fontWeight:700, fontSize:13 }}>
                  {imgGenerating?`⏳ ${t("מייצר...","Generating...")}`:`🎨 ${t("צור תמונה","Generate Image")}`}
                </button>
                <div style={{ fontSize:11, color:C.textMuted }}>{t("מופעל ע\"י Gemini Imagen (נדרש API Key בחיבורים)","Powered by Gemini Imagen (requires API key in Connections)")}</div>
              </div>
              {imgGenerating && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:30 }}>
                  <div style={{ width:36, height:36, border:`3px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                  <div style={{ fontSize:13, color:C.textSub }}>{t("מייצר תמונה עם AI...","Generating image with AI...")}</div>
                </div>
              )}
              {imgDone && !imgGenerating && (
                <div>
                  <div style={{ borderRadius:10, overflow:"hidden", marginBottom:12 }}>
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl} alt={lang==="he"?product.nameEn:product.nameEn} style={{ width:"100%", maxHeight:300, objectFit:"cover", borderRadius:10 }} />
                    ) : (
                      <div style={{ height:200, background:`linear-gradient(135deg,${C.accentLight},${C.purpleLight})`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
                        <span style={{ fontSize:56 }}>{product.image}</span>
                        <div style={{ fontSize:12, color:C.textSub, fontWeight:600 }}>{lang==="he"?product.name:product.nameEn}</div>
                        <div style={{ fontSize:10, color:C.textMuted }}>{t("חבר Gemini ליצירת תמונות אמיתיות","Connect Gemini for real image generation")}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {imgUrl && <a href={imgUrl} download style={{ padding:"8px 18px", borderRadius:8, border:"none", background:C.green, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, textDecoration:"none" }}>⬇️ {t("הורד","Download")}</a>}
                    <button onClick={()=>{setImgDone(false);setImgUrl(null);}} style={{ padding:"8px 18px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer", fontSize:13 }}>🔄 {t("צור מחדש","Regenerate")}</button>
                    <button onClick={()=>setStep(4)} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:C.accent, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>→ {t("המשך לפרסום","Continue to Publish")}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Preview + Publish ─────────────────────────────── */}
      {step===4 && product && variants.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* variant selector */}
          <div className="as-card" style={{ padding:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:14 }}>✅ {t("3 גרסאות מודעה נוצרו","3 Ad Variants Generated")}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
              {variants.map((v,i) => (
                <button key={i} onClick={()=>setChosen(i)} style={{ display:"flex", gap:12, padding:"11px 14px", border:`2px solid ${chosen===i?C.accent:C.border}`, borderRadius:10, background:chosen===i?C.accentLight:C.card, cursor:"pointer", textAlign:"start", alignItems:"center", transition:"all 0.15s" }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", background:chosen===i?C.accent:C.border, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:2 }}>{v.headline}</div>
                    <div style={{ fontSize:12, color:C.textSub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.body}</div>
                  </div>
                  <div style={{ background:v.score>=90?C.greenLight:C.amberLight, color:v.score>=90?C.greenText:C.amberText, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:6, flexShrink:0 }}>{v.score}</div>
                </button>
              ))}
            </div>
            <button onClick={()=>{setStep(3);setVariants([]);}} style={{ fontSize:12, color:C.accent, background:"none", border:"none", cursor:"pointer" }}>🔄 {t("צור מחדש","Regenerate")}</button>
          </div>

          {/* Preview */}
          <div className="as-card" style={{ padding:20 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:16 }}>👁️ {t("תצוגה מקדימה","Preview")} — {pl.label}</div>
            {platform==="meta"   && <MetaPreview   p={product} v={variants[chosen]} lang={lang} />}
            {platform==="google" && <GooglePreview p={product} v={variants[chosen]} lang={lang} />}
            {platform==="tiktok" && <TikTokPreview p={product} v={variants[chosen]} lang={lang} />}
          </div>

          {/* Publish */}
          <div className="as-card" style={{ padding:20 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>🚀 {t("פרסום ישיר","Direct Publish")}</div>
            {published ? (
              <div style={{ background:C.greenLight, border:`1px solid ${C.greenA}`, borderRadius:10, padding:"14px 18px", color:C.greenText, fontWeight:700, fontSize:14 }}>
                ✅ {t(`המודעה פורסמה ב-${pl.label}!`,`Ad published to ${pl.label}!`)}
              </div>
            ) : (
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button onClick={doPublish} disabled={publishing} style={{ flex:1, minWidth:160, padding:"12px 20px", borderRadius:10, border:"none", background:publishing?C.border:pl.color, color:"#fff", cursor:publishing?"not-allowed":"pointer", fontWeight:700, fontSize:14 }}>
                  {publishing?`⏳ ${t("מפרסם...","Publishing...")}`:`🚀 ${t("פרסם ב-","Publish to ")}${pl.label}`}
                </button>
                <button style={{ padding:"12px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer", fontWeight:600 }}>💾 {t("טיוטה","Draft")}</button>
                <button onClick={()=>{setStep(1);setProduct(null);setVariants([]);setPublished(false);setImgDone(false);}} style={{ padding:"12px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer" }}>+ {t("מודעה חדשה","New Ad")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
