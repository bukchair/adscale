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
}

function wooToDisplay(p: WooProduct): DisplayProduct {
  const hasTitle = p.name.trim().length >= 20;
  const hasMeta  = p.short_description.trim().length >= 50;
  const hasAlt   = !!(p.images[0]?.alt?.trim());
  const seoScore = Math.round(
    (hasTitle ? 40 : 0) + (hasMeta ? 40 : 0) + (hasAlt ? 20 : 0) +
    (p.name.length >= 40 ? 0 : 0)   // balanced
  );
  const cat = p.categories[0]?.name ?? "—";
  const emojis: Record<string, string> = {
    "נעליים": "👟", "shoes": "👟", "תיקים": "👜", "bags": "👜",
    "אלקטרוניקה": "📱", "tech": "📱", "electronics": "📱",
    "יופי": "💄", "beauty": "💄", "מזון": "🍔", "food": "🍔",
    "ספורט": "⚽", "sport": "⚽", "ביגוד": "👕", "clothing": "👕",
  };
  const imageEmoji = emojis[cat.toLowerCase()] ?? "🛍️";
  return {
    id: String(p.id),
    name: p.name,
    price: parseFloat(p.price) || 0,
    category: cat,
    image: p.images[0]?.src ?? "",
    imageEmoji,
    inStock: p.stock_status === "instock",
    stockQty: p.stock_quantity,
    hasTitle,
    hasMeta,
    hasAlt,
    seoScore,
    permalink: p.permalink,
  };
}

const SEO_SCORE_COLOR = (s: number) =>
  s >= 75 ? C.green : s >= 50 ? C.amber : C.red;
const SEO_SCORE_BG = (s: number) =>
  s >= 75 ? C.greenLight : s >= 50 ? C.amberLight : C.redLight;

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
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated]   = useState<Set<string>>(new Set());
  const [wooConnected, setWooConnected] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const conns = getConnections();
      const woo = conns.woocommerce;
      setWooConnected(!!(woo?.connected && woo.fields?.store_url && woo.fields?.consumer_key));
      const res = await fetch("/api/woocommerce/products", {
        headers: { "x-connections": JSON.stringify({
          woocommerce: woo?.fields ?? {},
        }) },
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

  // Initial fetch + listen for connection changes
  useEffect(() => {
    fetchProducts();
    const handler = () => fetchProducts();
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
      if (sortBy === "price")    diff = a.price - b.price;
      else if (sortBy === "seoScore") diff = a.seoScore - b.seoScore;
      else diff = a.name.localeCompare(b.name);
      return sortDir === "desc" ? -diff : diff;
    });
    return result;
  }, [products, search, catFilter, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const generateSEO = async (id: string) => {
    setGenerating(id);
    await new Promise(r => setTimeout(r, 1500));
    setGenerated(prev => new Set(prev).add(id));
    setGenerating(null);
  };

  const avgSEO     = products.length ? Math.round(products.reduce((s, p) => s + p.seoScore, 0) / products.length) : 0;
  const lowSEO     = products.filter(p => p.seoScore < 60).length;
  const missingMeta = products.filter(p => !p.hasMeta).length;
  const outOfStock  = products.filter(p => !p.inStock).length;

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? <span style={{ fontSize: 10, marginLeft: 4, color: C.accent }}>{sortDir === "desc" ? "▼" : "▲"}</span>
      : <span style={{ fontSize: 10, marginLeft: 4, color: C.textMuted }}>⇅</span>;

  return (
    <div>
      {/* Demo / not-connected banner */}
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

      {/* KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: t("מוצרים", "Products"),          val: loading ? "…" : products.length.toString(),                      color: C.accent, icon: "🛍️", bg: C.accentLight },
          { label: t("ציון SEO ממוצע","Avg SEO"),    val: loading ? "…" : `${avgSEO}/100`,                                  color: avgSEO >= 70 ? C.green : C.amber, icon: "🎯", bg: avgSEO >= 70 ? C.greenLight : C.amberLight },
          { label: t("SEO חלש", "Low SEO"),            val: loading ? "…" : `${lowSEO} ${t("מוצרים", "items")}`,           color: C.red,    icon: "⚠️", bg: C.redLight    },
          { label: t("חסר מטא",  "Missing Meta"),     val: loading ? "…" : `${missingMeta} ${t("מוצרים", "pages")}`,      color: C.orange, icon: "📝", bg: C.orangeLight },
          { label: t("אזל מהמלאי", "Out of Stock"),  val: loading ? "…" : `${outOfStock} ${t("מוצרים", "items")}`,        color: C.red,    icon: "📦", bg: C.redLight    },
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
            onClick={() => {}}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            }}
          >🤖 {t("צור SEO לכולם", "Generate SEO for All")}</button>
        </div>
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
            <div style={{ fontSize: 14 }}>{t("שגיאה בטעינת מוצרים", "Error loading products")}: {error}</div>
          </div>
        ) : (
          <>
            <div className="as-table-container">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.pageBg }}>
                    <th style={{ padding: "12px 16px", textAlign: "start", color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}`, cursor: "pointer" }}
                        onClick={() => toggleSort("name")}>
                      {t("מוצר", "Product")}<SortIcon col="name" />
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "start", color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}`, cursor: "pointer" }}
                        onClick={() => toggleSort("price")}>
                      {t("מחיר", "Price")}<SortIcon col="price" />
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "start", color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}` }}>
                      {t("מלאי", "Stock")}
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "start", color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}`, cursor: "pointer" }}
                        onClick={() => toggleSort("seoScore")}>
                      {t("ציון SEO", "SEO Score")}<SortIcon col="seoScore" />
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "start", color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}` }}>
                      SEO
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "start", color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}` }}>
                      {t("פעולות", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const isGen  = generating === p.id;
                    const isDone = generated.has(p.id);
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.pageBg }}>
                        {/* Product */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {p.image ? (
                              <img
                                src={p.image} alt={p.name}
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

                        {/* SEO Score bar */}
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

                        {/* SEO badges */}
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
                              onClick={() => generateSEO(p.id)}
                              disabled={isGen}
                              style={{
                                padding: "5px 12px", borderRadius: 6, border: "none",
                                background: isDone ? C.greenLight : isGen ? C.border : C.accentLight,
                                color: isDone ? C.greenText : isGen ? C.textMuted : C.accent,
                                cursor: isGen ? "not-allowed" : "pointer",
                                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                              }}
                            >
                              {isGen ? "⏳" : isDone ? "✅" : `🤖 ${t("SEO", "SEO")}`}
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
    </div>
  );
}
