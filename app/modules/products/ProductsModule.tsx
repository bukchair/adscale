"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { C } from "../theme";
import { getConnections } from "../../lib/auth";
import type { Lang } from "../page";

interface WooProduct {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: { id: number; name: string }[];
  images: { src: string; alt: string }[];
  stock_status: string;
  stock_quantity: number | null;
  description: string;
  short_description: string;
  permalink: string;
}

interface DisplayProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  imageEmoji: string;
  inStock: boolean;
  stockQty: number | null;
  hasTitle: boolean;
  hasMeta: boolean;
  hasAlt: boolean;
  seoScore: number;
  permalink: string;
  // raw for AI
  rawDescription: string;
  rawShortDescription: string;
}

interface SeoSuggestion {
  productId: string;
  title: string;
  metaDescription: string;
  altText: string;
  score: number;
  tips: string[];
}

function wooToDisplay(p: WooProduct): DisplayProduct {
  const hasTitle = p.name.trim().length >= 20;
  const hasMeta  = p.short_description.trim().length >= 50;
  const hasAlt   = !!(p.images[0]?.alt?.trim());
  const seoScore = (hasTitle ? 40 : 0) + (hasMeta ? 40 : 0) + (hasAlt ? 20 : 0);
  const cat = p.categories[0]?.name ?? "—";
  const emojis: Record<string, string> = {
    "נעליים": "👟", "shoes": "👟", "תיקים": "👜", "bags": "👜",
    "אלקטרוניקה": "📱", "tech": "📱", "electronics": "📱",
    "יופי": "💄", "beauty": "💄", "מזון": "🍔", "food": "🍔",
    "ספורט": "⚽", "sport": "⚽", "ביגוד": "👕", "clothing": "👕",
  };
  return {
    id: String(p.id),
    name: p.name,
    price: parseFloat(p.price) || 0,
    category: cat,
    image: p.images[0]?.src ?? "",
    imageEmoji: emojis[cat.toLowerCase()] ?? "🛍️",
    inStock: p.stock_status === "instock",
    stockQty: p.stock_quantity,
    hasTitle,
    hasMeta,
    hasAlt,
    seoScore,
    permalink: p.permalink,
    rawDescription: p.description,
    rawShortDescription: p.short_description,
  };
}

const SEO_SCORE_COLOR = (s: number) =>
  s >= 75 ? C.green : s >= 50 ? C.amber : C.red;
const SEO_SCORE_BG = (s: number) =>
  s >= 75 ? C.greenLight : s >= 50 ? C.amberLight : C.redLight;

/* ─────────────────────── SEO Modal ─────────────────────── */
function SeoModal({ product, suggestion, lang, onClose }: {
  product: DisplayProduct;
  suggestion: SeoSuggestion | null;
  lang: Lang;
  onClose: () => void;
}) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  if (!suggestion) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.card, borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: C.shadowLg, border: `1px solid ${C.border}`, maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI SEO</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{product.name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 13, fontWeight: 800, padding: "3px 10px", borderRadius: 8,
              background: SEO_SCORE_BG(suggestion.score), color: SEO_SCORE_COLOR(suggestion.score),
            }}>
              {t("ציון צפוי", "Expected")} {suggestion.score}/100
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textMuted, padding: "0 4px" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* SEO Title */}
          <SeoField
            label={t("כותרת SEO", "SEO Title")}
            value={suggestion.title}
            hint={`${suggestion.title.length} ${t("תווים (מומלץ 60-70)", "chars (60-70 recommended)")}`}
            hintColor={suggestion.title.length >= 60 && suggestion.title.length <= 70 ? C.green : C.amber}
            onCopy={() => copy(suggestion.title, "title")}
            copied={copied === "title"}
            t={t}
          />
          {/* Meta Description */}
          <SeoField
            label={t("תיאור מטא", "Meta Description")}
            value={suggestion.metaDescription}
            hint={`${suggestion.metaDescription.length} ${t("תווים (מומלץ 150-160)", "chars (150-160 recommended)")}`}
            hintColor={suggestion.metaDescription.length >= 150 && suggestion.metaDescription.length <= 160 ? C.green : C.amber}
            onCopy={() => copy(suggestion.metaDescription, "meta")}
            copied={copied === "meta"}
            t={t}
          />
          {/* Alt Text */}
          <SeoField
            label={t("Alt לתמונה", "Image Alt Text")}
            value={suggestion.altText}
            hint={`${suggestion.altText.length} ${t("תווים", "chars")}`}
            hintColor={suggestion.altText.length > 5 ? C.green : C.red}
            onCopy={() => copy(suggestion.altText, "alt")}
            copied={copied === "alt"}
            t={t}
          />

          {/* Tips */}
          {suggestion.tips?.length > 0 && (
            <div style={{ background: C.accentLight, border: `1px solid ${C.accentA}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                💡 {t("טיפים נוספים", "Additional Tips")}
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4 }}>
                {suggestion.tips.map((tip, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Before/After score */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: C.redLight, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{t("לפני", "Before")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: SEO_SCORE_COLOR(product.seoScore) }}>{product.seoScore}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", fontSize: 20 }}>→</div>
            <div style={{ flex: 1, background: C.greenLight, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{t("אחרי", "After")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: SEO_SCORE_COLOR(suggestion.score) }}>{suggestion.score}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeoField({ label, value, hint, hintColor, onCopy, copied, t }: {
  label: string; value: string; hint: string; hintColor: string;
  onCopy: () => void; copied: boolean;
  t: (he: string, en: string) => string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>{label}</span>
        <span style={{ fontSize: 11, color: hintColor }}>{hint}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{
          flex: 1, padding: "10px 12px", background: C.pageBg,
          border: `1px solid ${C.border}`, borderRadius: 8,
          fontSize: 13, color: C.text, lineHeight: 1.5,
        }}>{value}</div>
        <button
          onClick={onCopy}
          style={{
            flexShrink: 0, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: `1px solid ${C.border}`, background: copied ? C.greenLight : C.card,
            color: copied ? C.greenText : C.textSub, cursor: "pointer", whiteSpace: "nowrap",
          }}
        >{copied ? "✓" : t("העתק", "Copy")}</button>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Module ─────────────────────── */
export default function ProductsModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;

  const [products, setProducts]   = useState<DisplayProduct[]>([]);
  const [isDemo, setIsDemo]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy]       = useState<"price" | "seoScore" | "name">("name");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc");
  const [wooConnected, setWooConnected]   = useState(false);
  const [openaiConnected, setOpenaiConnected] = useState(false);

  // AI SEO state
  const [aiLoading, setAiLoading]   = useState<Set<string>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, SeoSuggestion>>({});
  const [modalProduct, setModalProduct]   = useState<DisplayProduct | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError]     = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const conns = getConnections();
      const woo = conns.woocommerce;
      const oai = conns.openai;
      setWooConnected(!!(woo?.connected && woo.fields?.store_url && woo.fields?.consumer_key));
      setOpenaiConnected(!!(oai?.connected && oai.fields?.api_key));
      const res = await fetch("/api/woocommerce/products", {
        headers: { "x-connections": JSON.stringify({ woocommerce: woo?.fields ?? {} }) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts((data.products as WooProduct[]).map(wooToDisplay));
      setIsDemo(data.isDemo === true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const handler = () => {
      fetchProducts();
      // Refresh openai flag on connection change
      const conns = getConnections();
      setOpenaiConnected(!!(conns.openai?.connected && conns.openai.fields?.api_key));
    };
    window.addEventListener("bscale:connections-changed", handler);
    return () => window.removeEventListener("bscale:connections-changed", handler);
  }, [fetchProducts]);

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !p.category.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter !== "all" && p.category !== catFilter) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      let diff = 0;
      if (sortBy === "price")         diff = a.price - b.price;
      else if (sortBy === "seoScore") diff = a.seoScore - b.seoScore;
      else                            diff = a.name.localeCompare(b.name);
      return sortDir === "desc" ? -diff : diff;
    });
    return result;
  }, [products, search, catFilter, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const callSeoApi = useCallback(async (targets: DisplayProduct[]) => {
    const conns = getConnections();
    const res = await fetch("/api/products/seo-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-connections": JSON.stringify({ openai: conns.openai?.fields ?? {} }),
      },
      body: JSON.stringify({
        lang,
        products: targets.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.rawDescription,
          shortDescription: p.rawShortDescription,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    return data.suggestions as SeoSuggestion[];
  }, [lang]);

  const generateSeoOne = useCallback(async (product: DisplayProduct) => {
    if (aiLoading.has(product.id)) return;
    setAiLoading(prev => new Set(prev).add(product.id));
    try {
      const suggestions = await callSeoApi([product]);
      if (suggestions[0]) {
        setAiSuggestions(prev => ({ ...prev, [product.id]: suggestions[0] }));
        setModalProduct(product);
      }
    } catch (e: any) {
      alert(`${t("שגיאה מ-OpenAI", "OpenAI error")}: ${e.message}`);
    } finally {
      setAiLoading(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  }, [aiLoading, callSeoApi, t]);

  const generateSeoAll = useCallback(async () => {
    if (bulkLoading || !products.length) return;
    setBulkLoading(true);
    setBulkError(null);
    try {
      const suggestions = await callSeoApi(products);
      const map: Record<string, SeoSuggestion> = {};
      suggestions.forEach(s => { map[s.productId] = s; });
      setAiSuggestions(prev => ({ ...prev, ...map }));
    } catch (e: any) {
      setBulkError(e.message);
    } finally {
      setBulkLoading(false);
    }
  }, [bulkLoading, products, callSeoApi]);

  const avgSEO      = products.length ? Math.round(products.reduce((s, p) => s + p.seoScore, 0) / products.length) : 0;
  const lowSEO      = products.filter(p => p.seoScore < 60).length;
  const missingMeta = products.filter(p => !p.hasMeta).length;
  const outOfStock  = products.filter(p => !p.inStock).length;

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? <span style={{ fontSize: 10, marginLeft: 4, color: C.accent }}>{sortDir === "desc" ? "▼" : "▲"}</span>
      : <span style={{ fontSize: 10, marginLeft: 4, color: C.textMuted }}>⇅</span>;

  return (
    <div>
      {/* Demo banner */}
      {!loading && isDemo && (
        <div style={{
          marginBottom: 16, padding: "12px 18px", borderRadius: 10,
          background: wooConnected ? "#fef3c7" : "#ede9fe",
          border: `1px solid ${wooConnected ? "#f59e0b" : C.accent}44`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>{wooConnected ? "⚠️" : "🔌"}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
              {wooConnected
                ? t("לא הצלחנו להתחבר ל-WooCommerce — מוצגים נתוני דמו", "Could not connect to WooCommerce — showing demo data")
                : t("WooCommerce לא מחובר — מוצגים מוצרי דמו", "WooCommerce not connected — showing demo products")}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {t("עבור לחיבורים כדי לחבר את החנות שלך", "Go to Integrations to connect your store")}
            </div>
          </div>
        </div>
      )}

      {/* OpenAI not connected notice */}
      {!loading && !openaiConnected && (
        <div style={{
          marginBottom: 16, padding: "10px 16px", borderRadius: 10,
          background: C.pageBg, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.textMuted,
        }}>
          <span>⚡</span>
          <span>{t("חבר OpenAI בחיבורים כדי לקבל הצעות SEO מבוססות AI", "Connect OpenAI in Integrations to get AI-powered SEO suggestions")}</span>
        </div>
      )}

      {/* KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: t("מוצרים", "Products"),         val: loading ? "…" : products.length.toString(),              color: C.accent, icon: "🛍️", bg: C.accentLight },
          { label: t("ציון SEO ממוצע","Avg SEO"),   val: loading ? "…" : `${avgSEO}/100`,                         color: avgSEO >= 70 ? C.green : C.amber, icon: "🎯", bg: avgSEO >= 70 ? C.greenLight : C.amberLight },
          { label: t("SEO חלש", "Low SEO"),          val: loading ? "…" : `${lowSEO} ${t("מוצרים", "items")}`,    color: C.red,    icon: "⚠️", bg: C.redLight    },
          { label: t("חסר מטא", "Missing Meta"),    val: loading ? "…" : `${missingMeta} ${t("מוצרים", "pages")}`,color: C.orange, icon: "📝", bg: C.orangeLight },
          { label: t("אזל מהמלאי", "Out of Stock"), val: loading ? "…" : `${outOfStock} ${t("מוצרים", "items")}`, color: C.red,    icon: "📦", bg: C.redLight    },
        ].map(m => (
          <div key={m.label} className="as-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, background: m.bg, border: `1px solid ${m.color}22` }}>
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{m.val}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="as-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("🔍 חפש מוצר...", "🔍 Search products...")}
            style={{
              flex: 1, minWidth: 200, padding: "8px 14px",
              border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.inputBg, color: C.text, fontSize: 13, outline: "none",
            }}
          />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            style={{
              padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.inputBg, color: C.text, fontSize: 13, cursor: "pointer",
            }}
          >
            <option value="all">{t("כל הקטגוריות", "All Categories")}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={fetchProducts}
            disabled={loading}
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.card, color: C.textSub, cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            }}
          >{loading ? "⏳" : "🔄"} {t("רענן", "Refresh")}</button>
          <button
            onClick={generateSeoAll}
            disabled={bulkLoading || !openaiConnected || loading}
            title={!openaiConnected ? t("חבר OpenAI תחילה", "Connect OpenAI first") : ""}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: openaiConnected
                ? `linear-gradient(135deg, ${C.accent}, ${C.purple})`
                : C.border,
              color: openaiConnected ? "#fff" : C.textMuted,
              cursor: (bulkLoading || !openaiConnected || loading) ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            }}
          >{bulkLoading ? `⏳ ${t("מחשב...", "Analyzing...")}` : `🤖 ${t("צור SEO לכולם", "Generate SEO for All")}`}</button>
        </div>
        {bulkError && (
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: C.redLight, color: C.redText, fontSize: 12 }}>
            ❌ {bulkError}
          </div>
        )}
        {Object.keys(aiSuggestions).length > 0 && !bulkLoading && (
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: C.greenLight, color: C.greenText, fontSize: 12 }}>
            ✅ {t(`נוצרו הצעות SEO ל-${Object.keys(aiSuggestions).length} מוצרים — לחץ על "SEO" ליד כל מוצר לצפייה`,
                   `SEO suggestions generated for ${Object.keys(aiSuggestions).length} products — click "SEO" next to any product to view`)}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="as-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: C.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14 }}>{t("טוען מוצרים...", "Loading products...")}</div>
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: "center", color: C.red }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 14 }}>{t("שגיאה", "Error")}: {error}</div>
          </div>
        ) : (
          <>
            <div className="as-table-container">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.pageBg }}>
                    {/* Product */}
                    <th style={TH} onClick={() => toggleSort("name")} >
                      {t("מוצר", "Product")}<SortIcon col="name" />
                    </th>
                    {/* Price */}
                    <th style={TH} onClick={() => toggleSort("price")}>
                      {t("מחיר", "Price")}<SortIcon col="price" />
                    </th>
                    {/* Stock */}
                    <th style={{ ...TH, cursor: "default" }}>{t("מלאי", "Stock")}</th>
                    {/* SEO Score */}
                    <th style={TH} onClick={() => toggleSort("seoScore")}>
                      {t("ציון SEO", "SEO Score")}<SortIcon col="seoScore" />
                    </th>
                    {/* SEO Badges */}
                    <th style={{ ...TH, cursor: "default" }}>SEO</th>
                    {/* Actions */}
                    <th style={{ ...TH, cursor: "default" }}>{t("פעולות", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const isAiLoading = aiLoading.has(p.id);
                    const hasSuggestion = !!aiSuggestions[p.id];
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.pageBg }}>
                        {/* Product cell */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {p.image ? (
                              <img src={p.image} alt={p.name}
                                style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}` }}
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: 8, background: C.accentLight, border: `1px solid ${C.accentA}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                                {p.imageEmoji}
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                                style={{ fontWeight: 600, color: C.text, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220, display: "block" }}>
                                {p.name}
                              </a>
                              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{p.category}</div>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>
                          ₪{p.price.toLocaleString()}
                        </td>

                        {/* Stock */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                            background: p.inStock ? C.greenLight : C.redLight,
                            color: p.inStock ? C.greenText : C.redText,
                          }}>
                            {p.inStock
                              ? (p.stockQty !== null ? `${t("במלאי", "In stock")} (${p.stockQty})` : t("במלאי", "In stock"))
                              : t("אזל", "Out of stock")}
                          </span>
                        </td>

                        {/* SEO Score */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 4, minWidth: 60 }}>
                              <div style={{ height: "100%", borderRadius: 4, width: `${p.seoScore}%`, background: SEO_SCORE_COLOR(p.seoScore) }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: SEO_SCORE_BG(p.seoScore), color: SEO_SCORE_COLOR(p.seoScore), flexShrink: 0 }}>
                              {p.seoScore}
                            </span>
                          </div>
                        </td>

                        {/* SEO Badges */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {[
                              { label: "T", ok: p.hasTitle, tip: t("כותרת ≥ 20 תווים", "Title ≥ 20 chars") },
                              { label: "M", ok: p.hasMeta,  tip: t("תיאור קצר ≥ 50 תווים", "Short desc ≥ 50 chars") },
                              { label: "A", ok: p.hasAlt,   tip: t("Alt לתמונה", "Image alt text") },
                            ].map(b => (
                              <span key={b.label} title={b.tip} style={{
                                width: 20, height: 20, borderRadius: 4,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 800,
                                background: b.ok ? C.greenLight : C.redLight,
                                color: b.ok ? C.greenText : C.redText,
                              }}>{b.label}</span>
                            ))}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => {
                                if (hasSuggestion) {
                                  setModalProduct(p);
                                } else if (openaiConnected) {
                                  generateSeoOne(p);
                                }
                              }}
                              disabled={isAiLoading || !openaiConnected}
                              title={!openaiConnected ? t("חבר OpenAI תחילה", "Connect OpenAI first") : ""}
                              style={{
                                padding: "5px 12px", borderRadius: 6, border: "none",
                                background: hasSuggestion ? C.greenLight : isAiLoading ? C.border : openaiConnected ? C.accentLight : C.pageBg,
                                color: hasSuggestion ? C.greenText : isAiLoading ? C.textMuted : openaiConnected ? C.accent : C.textMuted,
                                cursor: (isAiLoading || !openaiConnected) ? "not-allowed" : "pointer",
                                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                              }}
                            >
                              {isAiLoading ? "⏳" : hasSuggestion ? `✅ ${t("הצג", "View")}` : `🤖 ${t("SEO AI", "AI SEO")}`}
                            </button>
                            <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                              style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, cursor: "pointer", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center" }}>
                              🔗
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{t(`מציג ${filtered.length} מתוך ${products.length} מוצרים`, `Showing ${filtered.length} of ${products.length} products`)}</span>
              {isDemo && <span style={{ padding: "2px 8px", borderRadius: 10, background: C.accentLight, color: C.accent, fontWeight: 700, fontSize: 11 }}>{t("דמו", "DEMO")}</span>}
            </div>
          </>
        )}
      </div>

      {/* SEO Modal */}
      {modalProduct && aiSuggestions[modalProduct.id] && (
        <SeoModal
          product={modalProduct}
          suggestion={aiSuggestions[modalProduct.id]}
          lang={lang}
          onClose={() => setModalProduct(null)}
        />
      )}
    </div>
  );
}

const TH: React.CSSProperties = {
  padding: "12px 16px", textAlign: "start", color: C.textMuted,
  fontWeight: 700, fontSize: 11, textTransform: "uppercase",
  letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}`,
  cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
};
