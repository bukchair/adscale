"use client";
import { useState, useMemo } from "react";
import { C } from "../theme";
import type { Lang } from "../page";

interface Product {
  id: string;
  name: string;
  nameEn: string;
  sku: string;
  price: number;
  sales: number;
  revenue: number;
  convRate: number;
  seoScore: number;
  geoScore: number;
  stock: number;
  category: string;
  categoryEn: string;
  image: string;
  hasTitle: boolean;
  hasMeta: boolean;
  hasAlt: boolean;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "נעלי ריצה X1 מקצועיות", nameEn: "Running Shoes X1 Pro",       sku: "RS-X1-001", price: 299,  sales: 187, revenue: 55913, convRate: 4.2, seoScore: 82, geoScore: 71, stock: 34,  category: "נעלי ריצה",    categoryEn: "Running Shoes",  image: "👟", hasTitle: true,  hasMeta: true,  hasAlt: false },
  { id: "2", name: "נעלי ריצה X2 אולטרה",   nameEn: "Running Shoes X2 Ultra",     sku: "RS-X2-001", price: 449,  sales: 94,  revenue: 42206, convRate: 3.8, seoScore: 91, geoScore: 85, stock: 12,  category: "נעלי ריצה",    categoryEn: "Running Shoes",  image: "👟", hasTitle: true,  hasMeta: true,  hasAlt: true  },
  { id: "3", name: "גרביים לריצה 3 זוגות",  nameEn: "Running Socks 3-Pack",       sku: "SK-RUN-3P", price: 89,   sales: 342, revenue: 30438, convRate: 6.1, seoScore: 45, geoScore: 28, stock: 210, category: "אביזרים",       categoryEn: "Accessories",    image: "🧦", hasTitle: false, hasMeta: false, hasAlt: false },
  { id: "4", name: "חגורת ריצה עם כיסים",   nameEn: "Running Belt with Pockets",  sku: "BT-RUN-001", price: 129, sales: 78,  revenue: 10062, convRate: 2.9, seoScore: 67, geoScore: 41, stock: 56,  category: "אביזרים",       categoryEn: "Accessories",    image: "🎽", hasTitle: true,  hasMeta: false, hasAlt: false },
  { id: "5", name: "בקבוק מים ספורטיבי",    nameEn: "Sports Water Bottle",        sku: "WB-SPT-001", price: 59,  sales: 523, revenue: 30857, convRate: 7.8, seoScore: 54, geoScore: 33, stock: 890, category: "אביזרים",       categoryEn: "Accessories",    image: "🍶", hasTitle: false, hasMeta: false, hasAlt: false },
  { id: "6", name: "נעלי אימון כושר X3",    nameEn: "Training Shoes X3",          sku: "TS-X3-001",  price: 349, sales: 61,  revenue: 21289, convRate: 3.1, seoScore: 78, geoScore: 62, stock: 28,  category: "נעלי אימון",    categoryEn: "Training Shoes", image: "👟", hasTitle: true,  hasMeta: true,  hasAlt: true  },
  { id: "7", name: "אוזניות ספורט אלחוטיות",nameEn: "Wireless Sport Earbuds",     sku: "EP-SPT-BT",  price: 199, sales: 156, revenue: 31044, convRate: 4.9, seoScore: 88, geoScore: 79, stock: 45,  category: "טכנולוגיה",     categoryEn: "Tech",           image: "🎧", hasTitle: true,  hasMeta: true,  hasAlt: false },
  { id: "8", name: "מחצלת יוגה פרמיום",     nameEn: "Premium Yoga Mat",           sku: "YM-PREMO",   price: 149, sales: 203, revenue: 30247, convRate: 5.6, seoScore: 36, geoScore: 22, stock: 67,  category: "יוגה",           categoryEn: "Yoga",           image: "🧘", hasTitle: false, hasMeta: false, hasAlt: false },
];

const SEO_SCORE_COLOR = (s: number) =>
  s >= 75 ? C.green : s >= 50 ? C.amber : C.red;

const SEO_SCORE_BG = (s: number) =>
  s >= 75 ? C.greenLight : s >= 50 ? C.amberLight : C.redLight;

export default function ProductsModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "seoScore" | "sales" | "convRate">("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [catFilter, setCatFilter] = useState("all");
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Set<string>>(new Set());

  const categories = Array.from(new Set(PRODUCTS.map(p => lang === "he" ? p.category : p.categoryEn)));

  const filtered = useMemo(() => {
    let result = PRODUCTS.filter(p => {
      const name = lang === "he" ? p.name : p.nameEn;
      const cat  = lang === "he" ? p.category : p.categoryEn;
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter !== "all" && cat !== catFilter) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      const diff = a[sortBy] - b[sortBy];
      return sortDir === "desc" ? -diff : diff;
    });
    return result;
  }, [search, catFilter, sortBy, sortDir, lang]);

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

  const totalRevenue  = PRODUCTS.reduce((s, p) => s + p.revenue, 0);
  const avgSEO        = Math.round(PRODUCTS.reduce((s, p) => s + p.seoScore, 0) / PRODUCTS.length);
  const lowSEO        = PRODUCTS.filter(p => p.seoScore < 60).length;
  const missingMeta   = PRODUCTS.filter(p => !p.hasMeta).length;

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? <span style={{ fontSize: 10, marginLeft: 4, color: C.accent }}>{sortDir === "desc" ? "▼" : "▲"}</span>
      : <span style={{ fontSize: 10, marginLeft: 4, color: C.textMuted }}>⇅</span>;

  return (
    <div>
      {/* KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: t("סה\"כ הכנסה", "Total Revenue"),  val: `₪${totalRevenue.toLocaleString()}`,       color: C.green,  icon: "💰", bg: C.greenLight  },
          { label: t("מוצרים",       "Products"),        val: PRODUCTS.length.toString(),                color: C.accent, icon: "🛍️", bg: C.accentLight },
          { label: t("ציון SEO ממוצע","Avg SEO Score"),  val: `${avgSEO}/100`,                           color: avgSEO >= 70 ? C.green : C.amber, icon: "🎯", bg: avgSEO >= 70 ? C.greenLight : C.amberLight },
          { label: t("SEO חלש", "Low SEO"),              val: `${lowSEO} ${t("מוצרים", "products")}`,   color: C.red,    icon: "⚠️", bg: C.redLight    },
          { label: t("חסר מטא",  "Missing Meta"),        val: `${missingMeta} ${t("מוצרים", "pages")}`, color: C.orange, icon: "📝", bg: C.orangeLight },
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
            onClick={() => { /* bulk generate */ }}
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
        <div className="as-table-container">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.pageBg }}>
                <th style={{ padding: "12px 16px", textAlign: "start", color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}` }}>
                  {t("מוצר", "Product")}
                </th>
                {[
                  { key: "revenue" as const,  he: "הכנסה",   en: "Revenue" },
                  { key: "sales" as const,    he: "מכירות",  en: "Sales" },
                  { key: "convRate" as const, he: "המרה",    en: "Conv. Rate" },
                  { key: "seoScore" as const, he: "ציון SEO", en: "SEO Score" },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    style={{
                      padding: "12px 16px", textAlign: "start", color: C.textMuted,
                      fontWeight: 700, fontSize: 11, textTransform: "uppercase",
                      letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}`,
                      cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
                    }}
                  >
                    {lang === "he" ? col.he : col.en}<SortIcon col={col.key} />
                  </th>
                ))}
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
                const name  = lang === "he" ? p.name  : p.nameEn;
                const cat   = lang === "he" ? p.category : p.categoryEn;
                const isGen = generating === p.id;
                const isDone = generated.has(p.id);
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: i % 2 === 0 ? C.card : C.pageBg,
                      transition: "background 0.1s",
                    }}
                  >
                    {/* Product cell */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 8,
                          background: C.accentLight, border: `1px solid ${C.accentA}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20, flexShrink: 0,
                        }}>{p.image}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{name}</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                            <span>{p.sku}</span>
                            <span style={{ margin: "0 6px", color: C.border }}>·</span>
                            <span>{cat}</span>
                            <span style={{ margin: "0 6px", color: C.border }}>·</span>
                            <span style={{ color: p.stock < 20 ? C.red : C.green }}>
                              {t("מלאי", "Stock")}: {p.stock}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: C.text }}>
                      ₪{p.revenue.toLocaleString()}
                    </td>

                    {/* Sales */}
                    <td style={{ padding: "14px 16px", color: C.textSub }}>
                      {p.sales}
                    </td>

                    {/* Conv rate */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: p.convRate >= 4 ? C.greenLight : p.convRate >= 2.5 ? C.amberLight : C.redLight,
                        color: p.convRate >= 4 ? C.greenText : p.convRate >= 2.5 ? C.amberText : C.redText,
                      }}>{p.convRate.toFixed(1)}%</span>
                    </td>

                    {/* SEO Score */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 4, minWidth: 60 }}>
                          <div style={{
                            height: "100%", borderRadius: 4,
                            width: `${p.seoScore}%`,
                            background: SEO_SCORE_COLOR(p.seoScore),
                          }} />
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                          background: SEO_SCORE_BG(p.seoScore), color: SEO_SCORE_COLOR(p.seoScore),
                          flexShrink: 0,
                        }}>{p.seoScore}</span>
                      </div>
                    </td>

                    {/* SEO badges */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[
                          { label: "T", ok: p.hasTitle, tip: "Title" },
                          { label: "M", ok: p.hasMeta,  tip: "Meta" },
                          { label: "A", ok: p.hasAlt,   tip: "Alt" },
                        ].map(b => (
                          <span
                            key={b.label}
                            title={b.tip}
                            style={{
                              width: 20, height: 20, borderRadius: 4,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 800,
                              background: b.ok ? C.greenLight : C.redLight,
                              color: b.ok ? C.greenText : C.redText,
                            }}
                          >{b.label}</span>
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
                        <button style={{
                          padding: "5px 10px", borderRadius: 6,
                          border: `1px solid ${C.border}`, background: C.card,
                          color: C.textSub, cursor: "pointer", fontSize: 12,
                        }}>✏️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>
          {t(`מציג ${filtered.length} מתוך ${PRODUCTS.length} מוצרים`, `Showing ${filtered.length} of ${PRODUCTS.length} products`)}
        </div>
      </div>
    </div>
  );
}
