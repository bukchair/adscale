"use client";
import { useState, useMemo } from "react";
import { C } from "../theme";
import { useDashboard, getDaysAgo, getToday } from "@/hooks/useDashboard";
import type { Lang } from "../page";

/* ── Excel/CSV Export utility ─────────────────────────────────────── */
function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Hebrew support in Excel
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = BOM + [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Demo data generators ─────────────────────────────────────────── */
function genMonthlyData() {
  const months = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יוני", "יולי", "אוג", "ספט", "אוק", "נוב", "דצמ"];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((m, i) => {
    const revenue = 18000 + Math.random() * 32000;
    const spend   = revenue * (0.18 + Math.random() * 0.12);
    const cogs    = revenue * (0.35 + Math.random() * 0.1);
    const profit  = revenue - spend - cogs;
    const roas    = revenue / spend;
    return { month: m, monthEn: monthsEn[i], revenue, spend, cogs, profit, roas };
  });
}

function genSEOData() {
  const keywords = [
    { kw: "נעלי ספורט אדידס",   kwEn: "Adidas sport shoes",    position: 3,  clicks: 1420, impressions: 18200, ctr: 7.8, trend: "up"   },
    { kw: "קניית נעליים אונליין", kwEn: "Buy shoes online",       position: 7,  clicks: 890,  impressions: 14700, ctr: 6.1, trend: "up"   },
    { kw: "נייקי ריצה",           kwEn: "Nike running",           position: 12, clicks: 640,  impressions: 11400, ctr: 5.6, trend: "down" },
    { kw: "נעלי ילדים",           kwEn: "Kids shoes",             position: 5,  clicks: 1100, impressions: 16800, ctr: 6.5, trend: "same" },
    { kw: "נעלי עור לגברים",      kwEn: "Men's leather shoes",    position: 9,  clicks: 420,  impressions: 8200,  ctr: 5.1, trend: "up"   },
    { kw: "מחיר נעלי ריצה",       kwEn: "Running shoes price",    position: 14, clicks: 310,  impressions: 6100,  ctr: 5.1, trend: "down" },
    { kw: "נעלי עקב שחורות",      kwEn: "Black heels",            position: 6,  clicks: 780,  impressions: 12300, ctr: 6.3, trend: "up"   },
    { kw: "אנגלית ספורט נעליים",  kwEn: "Sport shoes english",    position: 21, clicks: 120,  impressions: 3400,  ctr: 3.5, trend: "same" },
  ];
  return keywords;
}

function genPlatformData() {
  return [
    { platform: "Google Ads", icon: "🔵", revenue: 48200, spend: 9800, roas: 4.92, conversions: 284, cpa: 34.5, trend: "+12%" },
    { platform: "Meta Ads",   icon: "🔷", revenue: 31400, spend: 7200, roas: 4.36, conversions: 198, cpa: 36.4, trend: "+8%"  },
    { platform: "TikTok",     icon: "🎵", revenue: 14600, spend: 3900, roas: 3.74, conversions: 87,  cpa: 44.8, trend: "+22%" },
    { platform: "SEO Organic",icon: "🔍", revenue: 22800, spend: 0,    roas: 0,    conversions: 156, cpa: 0,    trend: "+18%" },
  ];
}

/* ── Mini bar chart ───────────────────────────────────────────────── */
function MiniBar({ value, max, color, height = 48 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height }}>
      <div style={{ width: 16, height: `${pct}%`, background: color, borderRadius: "3px 3px 0 0", minHeight: 3, transition: "height 0.4s ease" }} />
    </div>
  );
}

/* ── Trend badge ──────────────────────────────────────────────────── */
function TrendBadge({ trend }: { trend: "up" | "down" | "same" }) {
  const cfg = {
    up:   { icon: "↑", color: "#10b981", bg: "#d1fae5" },
    down: { icon: "↓", color: "#ef4444", bg: "#fee2e2" },
    same: { icon: "→", color: "#94a3b8", bg: "#f1f5f9" },
  }[trend];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
      {cfg.icon}
    </span>
  );
}

/* ── Main module ──────────────────────────────────────────────────── */
export default function FinancialReportsModule({ lang }: { lang: Lang }) {
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;

  const [activeSection, setActiveSection] = useState<"overview" | "monthly" | "platforms" | "seo">("overview");
  const [preset, setPreset] = useState(2); // 30 days default

  const presets = [
    { he: "7 ימים",  en: "7 days",   days: 7  },
    { he: "14 ימים", en: "14 days",  days: 14 },
    { he: "30 ימים", en: "30 days",  days: 30 },
    { he: "שנה",     en: "12 months",days: 365 },
  ];

  const { data, loading } = useDashboard(getDaysAgo(presets[preset].days), getToday());
  const summary = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };

  const monthlyData = useMemo(() => genMonthlyData(), []);
  const seoData     = useMemo(() => genSEOData(), []);
  const platforms   = useMemo(() => genPlatformData(), []);

  // Derived KPIs
  const totalRevenue     = summary.totalRevenue  || platforms.reduce((s, p) => s + p.revenue, 0);
  const totalSpend       = summary.totalSpent    || platforms.reduce((s, p) => s + p.spend, 0);
  const grossProfit      = totalRevenue * 0.52 - totalSpend;
  const netMargin        = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const avgRoas          = summary.avgRoas        || (totalRevenue / Math.max(totalSpend, 1));
  const totalConversions = summary.totalConversions || platforms.reduce((s, p) => s + p.conversions, 0);
  const avgCPA           = totalSpend / Math.max(totalConversions, 1);
  const totalOrganic     = platforms.find(p => p.platform === "SEO Organic")?.revenue ?? 22800;
  const organicShare     = totalRevenue > 0 ? (totalOrganic / totalRevenue) * 100 : 0;

  const kpis = [
    { label: t("סה\"כ הכנסות","Total Revenue"),      val: `₪${Math.round(totalRevenue).toLocaleString()}`,      color: C.green,  bg: C.greenLight,  icon: "💰", sub: t("+14% לעומת חודש שעבר","+14% vs last month") },
    { label: t("רווח גולמי","Gross Profit"),          val: `₪${Math.round(grossProfit).toLocaleString()}`,       color: C.teal,   bg: C.tealLight,   icon: "📈", sub: `${netMargin.toFixed(1)}% ${t("מרווח","margin")}` },
    { label: t("הוצאות פרסום","Ad Spend"),            val: `₪${Math.round(totalSpend).toLocaleString()}`,        color: C.accent, bg: C.accentLight, icon: "💸", sub: `${((totalSpend/Math.max(totalRevenue,1))*100).toFixed(1)}% ${t("מהכנסות","of revenue")}` },
    { label: "ROAS",                                   val: `${avgRoas.toFixed(2)}x`,                             color: C.amber,  bg: C.amberLight,  icon: "🎯", sub: t("ממוצע כל ערוצי פרסום","Avg across all channels") },
    { label: t("המרות","Conversions"),                 val: Math.round(totalConversions).toLocaleString(),        color: C.blue,   bg: C.blueLight,   icon: "🛒", sub: `₪${avgCPA.toFixed(0)} ${t("CPA ממוצע","avg CPA")}` },
    { label: t("תנועה אורגנית","Organic Traffic"),    val: `₪${Math.round(totalOrganic).toLocaleString()}`,      color: C.green,  bg: C.greenLight,  icon: "🔍", sub: `${organicShare.toFixed(1)}% ${t("מסה\"כ הכנסות","of total revenue")}` },
  ];

  /* ── Export functions ─────────────────────────────────────────── */
  function exportFinancialCSV() {
    const headers = isHe
      ? ["חודש", "הכנסות (₪)", "הוצאות פרסום (₪)", "עלות מוצר (₪)", "רווח (₪)", "ROAS"]
      : ["Month", "Revenue (₪)", "Ad Spend (₪)", "COGS (₪)", "Profit (₪)", "ROAS"];
    const rows = monthlyData.map(m => [
      isHe ? m.month : m.monthEn,
      Math.round(m.revenue),
      Math.round(m.spend),
      Math.round(m.cogs),
      Math.round(m.profit),
      m.roas.toFixed(2),
    ]);
    exportToCSV(`financial-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function exportPlatformCSV() {
    const headers = isHe
      ? ["פלטפורמה", "הכנסות (₪)", "הוצאות (₪)", "ROAS", "המרות", "CPA (₪)", "שינוי"]
      : ["Platform", "Revenue (₪)", "Spend (₪)", "ROAS", "Conversions", "CPA (₪)", "Change"];
    const rows = platforms.map(p => [
      p.platform, Math.round(p.revenue), Math.round(p.spend),
      p.roas ? p.roas.toFixed(2) : "N/A",
      p.conversions, p.cpa ? p.cpa.toFixed(0) : "N/A", p.trend,
    ]);
    exportToCSV(`platform-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function exportSEOCSV() {
    const headers = isHe
      ? ["מילת מפתח", "מיקום", "קליקים", "חשיפות", "CTR%", "מגמה"]
      : ["Keyword", "Position", "Clicks", "Impressions", "CTR%", "Trend"];
    const rows = seoData.map(k => [
      isHe ? k.kw : k.kwEn,
      k.position, k.clicks, k.impressions, k.ctr.toFixed(1),
      k.trend === "up" ? t("עולה","Rising") : k.trend === "down" ? t("יורד","Falling") : t("יציב","Stable"),
    ]);
    exportToCSV(`seo-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function exportAllCSV() {
    exportFinancialCSV();
    setTimeout(exportPlatformCSV, 300);
    setTimeout(exportSEOCSV, 600);
  }

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue));
  const maxProfit  = Math.max(...monthlyData.map(m => m.profit));

  const sections = [
    { id: "overview",   he: "סקירה כספית",  en: "Financial Overview" },
    { id: "monthly",    he: "דוח חודשי",     en: "Monthly Report"     },
    { id: "platforms",  he: "לפי ערוץ",      en: "By Channel"         },
    { id: "seo",        he: "ניתוח SEO",     en: "SEO Analysis"       },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="as-module-header">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>
            📊 {t("דוחות כספיים וניתוח SEO", "Financial Reports & SEO Analysis")}
          </h2>
          <p style={{ color: C.textSub, fontSize: 14, margin: 0 }}>
            {t("ניתוח ביצועים כספיים, SEO וייצוא לאקסל", "Financial performance, SEO analysis and Excel export")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Date preset */}
          <div style={{ background: C.pageBg, borderRadius: 8, padding: 3, border: `1px solid ${C.border}`, display: "flex" }}>
            {presets.map((p, i) => (
              <button key={i} onClick={() => setPreset(i)} style={{
                padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, background: preset === i ? C.accent : "transparent",
                color: preset === i ? "#fff" : C.textSub, transition: "all 0.15s", whiteSpace: "nowrap",
              }}>{isHe ? p.he : p.en}</button>
            ))}
          </div>
          {/* Export all */}
          <button onClick={exportAllCSV} className="as-export-btn excel">
            📥 {t("ייצוא הכל לאקסל", "Export All to Excel")}
          </button>
        </div>
      </div>

      {/* ── Section tabs ───────────────────────────────────────── */}
      <div className="as-tabs-scroll" style={{ display: "flex", gap: 4, background: C.cardAlt, borderRadius: 10, padding: 4, border: `1px solid ${C.border}`, width: "fit-content", maxWidth: "100%" }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              fontSize: 13, fontWeight: activeSection === s.id ? 700 : 400,
              background: activeSection === s.id ? C.card : "transparent",
              color: activeSection === s.id ? C.accent : C.textSub,
              boxShadow: activeSection === s.id ? C.shadow : "none",
              transition: "all 0.2s",
            }}
          >{isHe ? s.he : s.en}</button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────
          SECTION: FINANCIAL OVERVIEW
      ───────────────────────────────────────────────────────── */}
      {activeSection === "overview" && (
        <>
          {/* KPI cards */}
          <div className="as-report-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{k.icon}</span>
                  <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                  {loading ? "—" : k.val}
                </div>
                <div style={{ fontSize: 11, color: k.color, fontWeight: 600 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Revenue vs Spend bar chart (sparkline style) */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{t("מגמה חודשית — הכנסות מול רווח", "Monthly Trend — Revenue vs Profit")}</div>
              <button onClick={exportFinancialCSV} className="as-export-btn excel" style={{ fontSize: 12 }}>
                📥 {t("ייצוא CSV", "Export CSV")}
              </button>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80, overflowX: "auto" }}>
              {monthlyData.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1, minWidth: 28 }}>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
                    <div title={`${isHe ? m.month : m.monthEn}: ₪${Math.round(m.revenue).toLocaleString()}`}
                      style={{ width: 10, height: `${Math.max(4, (m.revenue / maxRevenue) * 60)}px`, background: C.green, borderRadius: "3px 3px 0 0", transition: "height 0.4s" }} />
                    <div title={`${t("רווח","Profit")}: ₪${Math.round(m.profit).toLocaleString()}`}
                      style={{ width: 10, height: `${Math.max(4, (Math.max(0, m.profit) / maxProfit) * 60)}px`, background: C.accent, borderRadius: "3px 3px 0 0", transition: "height 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 9, color: C.textMuted, textAlign: "center", whiteSpace: "nowrap" }}>{isHe ? m.month : m.monthEn.slice(0, 3)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textSub }}>
                <div style={{ width: 12, height: 12, background: C.green, borderRadius: 3 }} />
                {t("הכנסות","Revenue")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textSub }}>
                <div style={{ width: 12, height: 12, background: C.accent, borderRadius: 3 }} />
                {t("רווח","Profit")}
              </div>
            </div>
          </div>

          {/* Profit margin donut (simplified) */}
          <div className="as-2col-grid">
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>{t("פילוח הכנסות לפי ערוץ", "Revenue by Channel")}</div>
              {platforms.map(p => {
                const pct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={p.platform} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: C.text }}>{p.icon} {p.platform}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                        ₪{Math.round(p.revenue).toLocaleString()} <span style={{ color: C.textMuted, fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>{t("מדדי יעילות", "Efficiency Metrics")}</div>
              {[
                { label: t("מרווח נטו","Net Margin"),    val: `${netMargin.toFixed(1)}%`,                             color: netMargin > 20 ? C.green : netMargin > 10 ? C.amber : C.red },
                { label: t("אחוז הוצאה","Spend Ratio"),  val: `${((totalSpend / Math.max(totalRevenue,1))*100).toFixed(1)}%`, color: C.accent },
                { label: "ROAS " + t("ממוצע","Avg"),     val: `${avgRoas.toFixed(2)}x`,                               color: avgRoas > 4 ? C.green : avgRoas > 2.5 ? C.amber : C.red },
                { label: t("CPA ממוצע","Avg CPA"),       val: `₪${avgCPA.toFixed(0)}`,                                color: C.blue },
                { label: t("חלק אורגני","Organic Share"), val: `${organicShare.toFixed(1)}%`,                          color: C.teal },
                { label: t("המרות","Conversions"),        val: Math.round(totalConversions).toLocaleString(),           color: C.purple },
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: C.textSub }}>{m.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────
          SECTION: MONTHLY REPORT TABLE
      ───────────────────────────────────────────────────────── */}
      {activeSection === "monthly" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{t("דוח חודשי מפורט", "Detailed Monthly Report")}</div>
            <button onClick={exportFinancialCSV} className="as-export-btn excel">
              📥 {t("ייצוא לאקסל", "Export to Excel")}
            </button>
          </div>
          <div className="as-report-table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.cardAlt }}>
                  {[
                    t("חודש","Month"), t("הכנסות","Revenue"), t("הוצ׳ פרסום","Ad Spend"),
                    t("עלות מוצר","COGS"), t("רווח גולמי","Gross Profit"), "ROAS",
                    t("מרווח %","Margin %"),
                  ].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: isHe ? "right" : "left", color: C.textSub, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, i) => {
                  const margin = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0;
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.card : C.cardAlt, transition: "background 0.1s" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text, borderBottom: `1px solid ${C.border}` }}>{isHe ? m.month : m.monthEn}</td>
                      <td style={{ padding: "10px 14px", color: C.green, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>₪{Math.round(m.revenue).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", color: C.accent, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>₪{Math.round(m.spend).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", color: C.textSub, borderBottom: `1px solid ${C.border}` }}>₪{Math.round(m.cogs).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", color: m.profit > 0 ? C.teal : C.red, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>₪{Math.round(m.profit).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", color: m.roas > 4 ? C.green : m.roas > 2.5 ? C.amber : C.red, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{m.roas.toFixed(2)}x</td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 50, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, margin))}%`, height: "100%", background: margin > 20 ? C.green : margin > 10 ? C.amber : C.red, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap" }}>{margin.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: C.accentLight, fontWeight: 800 }}>
                  <td style={{ padding: "12px 14px", color: C.accent }}>{t("סה\"כ","Total")}</td>
                  <td style={{ padding: "12px 14px", color: C.green }}>₪{Math.round(monthlyData.reduce((s, m) => s + m.revenue, 0)).toLocaleString()}</td>
                  <td style={{ padding: "12px 14px", color: C.accent }}>₪{Math.round(monthlyData.reduce((s, m) => s + m.spend, 0)).toLocaleString()}</td>
                  <td style={{ padding: "12px 14px", color: C.textSub }}>₪{Math.round(monthlyData.reduce((s, m) => s + m.cogs, 0)).toLocaleString()}</td>
                  <td style={{ padding: "12px 14px", color: C.teal }}>₪{Math.round(monthlyData.reduce((s, m) => s + m.profit, 0)).toLocaleString()}</td>
                  <td style={{ padding: "12px 14px", color: C.amber }}>{(monthlyData.reduce((s, m) => s + m.roas, 0) / monthlyData.length).toFixed(2)}x</td>
                  <td style={{ padding: "12px 14px", color: C.textMuted }}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          SECTION: PLATFORMS / CHANNELS
      ───────────────────────────────────────────────────────── */}
      {activeSection === "platforms" && (
        <>
          {/* Platform KPI cards */}
          <div className="as-2col-grid">
            {platforms.map(p => (
              <div key={p.platform} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{p.platform}</div>
                      <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{p.trend}</div>
                    </div>
                  </div>
                  <div style={{ background: C.greenLight, color: C.green, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                    {t("פעיל","Active")}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { l: t("הכנסות","Revenue"), v: `₪${Math.round(p.revenue).toLocaleString()}`, c: C.green },
                    { l: t("הוצאות","Spend"),   v: p.spend > 0 ? `₪${Math.round(p.spend).toLocaleString()}` : t("אורגני","Organic"), c: C.accent },
                    { l: "ROAS",                v: p.roas > 0 ? `${p.roas.toFixed(2)}x` : "N/A",            c: C.amber },
                    { l: t("המרות","Conv."),    v: p.conversions.toString(),                                 c: C.blue  },
                  ].map(m => (
                    <div key={m.l} style={{ background: C.pageBg, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{m.l}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: m.c, marginTop: 2 }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Platform comparison table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{t("השוואת ערוצים","Channel Comparison")}</div>
              <button onClick={exportPlatformCSV} className="as-export-btn excel" style={{ fontSize: 12 }}>
                📥 {t("ייצוא","Export")}
              </button>
            </div>
            <div className="as-report-table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.cardAlt }}>
                    {[t("ערוץ","Channel"), t("הכנסות","Revenue"), t("הוצאות","Spend"), "ROAS", t("המרות","Conversions"), "CPA", t("שינוי","Change")].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: isHe ? "right" : "left", color: C.textSub, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platforms.map((p, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.card : C.cardAlt }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}` }}>{p.icon} {p.platform}</td>
                      <td style={{ padding: "10px 14px", color: C.green, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>₪{Math.round(p.revenue).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>{p.spend > 0 ? `₪${Math.round(p.spend).toLocaleString()}` : <span style={{ color: C.green }}>אורגני</span>}</td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, color: p.roas > 4 ? C.green : p.roas > 0 ? C.amber : C.textMuted, fontWeight: 700 }}>{p.roas > 0 ? `${p.roas.toFixed(2)}x` : "—"}</td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, color: C.blue, fontWeight: 600 }}>{p.conversions}</td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>{p.cpa > 0 ? `₪${p.cpa.toFixed(0)}` : "—"}</td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, color: C.green, fontWeight: 700 }}>{p.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────
          SECTION: SEO ANALYSIS
      ───────────────────────────────────────────────────────── */}
      {activeSection === "seo" && (
        <>
          {/* SEO KPI cards */}
          <div className="as-report-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: t("סה\"כ קליקים","Total Clicks"),       val: seoData.reduce((s, k) => s + k.clicks, 0).toLocaleString(),     icon: "👆", color: C.accent, bg: C.accentLight },
              { label: t("סה\"כ חשיפות","Total Impressions"),   val: seoData.reduce((s, k) => s + k.impressions, 0).toLocaleString(), icon: "👁️", color: C.blue,   bg: C.blueLight   },
              { label: t("CTR ממוצע","Avg CTR"),                val: `${(seoData.reduce((s, k) => s + k.ctr, 0) / seoData.length).toFixed(1)}%`, icon: "📊", color: C.amber, bg: C.amberLight },
              { label: t("מיקום ממוצע","Avg Position"),         val: (seoData.reduce((s, k) => s + k.position, 0) / seoData.length).toFixed(1), icon: "🏆", color: C.green, bg: C.greenLight },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{k.val}</div>
                <div style={{ fontSize: 11, color: k.color, fontWeight: 600, marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* SEO keywords table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{t("מילות מפתח — Search Console","Keywords — Search Console")}</div>
              <button onClick={exportSEOCSV} className="as-export-btn excel" style={{ fontSize: 12 }}>
                📥 {t("ייצוא לאקסל","Export to Excel")}
              </button>
            </div>
            <div className="as-report-table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.cardAlt }}>
                    {[
                      t("מילת מפתח","Keyword"), t("מיקום","Position"),
                      t("קליקים","Clicks"), t("חשיפות","Impressions"),
                      "CTR%", t("מגמה","Trend"), t("הזדמנות","Opportunity"),
                    ].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: isHe ? "right" : "left", color: C.textSub, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seoData.map((k, i) => {
                    const posColor = k.position <= 5 ? C.green : k.position <= 10 ? C.amber : C.red;
                    const opportunity = k.position > 10 ? t("שיפור מיקום","Improve ranking") : k.ctr < 5 ? t("שיפור CTR","Improve CTR") : t("שמור על מיקום","Maintain position");
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? C.card : C.cardAlt }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text, borderBottom: `1px solid ${C.border}` }}>{isHe ? k.kw : k.kwEn}</td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                          <span style={{ background: posColor + "20", color: posColor, borderRadius: 6, padding: "2px 8px", fontWeight: 800, fontSize: 13 }}>#{k.position}</span>
                        </td>
                        <td style={{ padding: "10px 14px", color: C.accent, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{k.clicks.toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", color: C.textSub, borderBottom: `1px solid ${C.border}` }}>{k.impressions.toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 36, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${(k.ctr / 10) * 100}%`, height: "100%", background: k.ctr > 6 ? C.green : k.ctr > 4 ? C.amber : C.red, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{k.ctr}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                          <TrendBadge trend={k.trend as "up" | "down" | "same"} />
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.textSub }}>{opportunity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEO Insights */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>
              💡 {t("תובנות SEO","SEO Insights")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "🏆", color: C.green, bg: C.greenLight, text: t("3 מילות מפתח בעמוד הראשון (מיקום 1-10) — המשך לפרסם תוכן רלוונטי", "3 keywords on page 1 (positions 1-10) — continue publishing relevant content") },
                { icon: "⚠️", color: C.amber, bg: C.amberLight, text: t("2 מילות מפתח במיקום 11-20 — שיפור קישורים פנימיים יכול להעלות לעמוד 1", "2 keywords at positions 11-20 — improving internal links can push to page 1") },
                { icon: "📈", color: C.accent, bg: C.accentLight, text: t("CTR ממוצע 6.1% — כותרות מושכות יותר יכולות להגביר קליקים ב-20-30%", "Avg CTR 6.1% — more compelling titles can boost clicks 20-30%") },
                { icon: "🔍", color: C.blue, bg: C.blueLight, text: t("תנועה אורגנית מהווה 19% מהכנסות — פוטנציאל גדול לצמיחה ללא עלות פרסום", "Organic traffic = 19% of revenue — great growth potential with no ad spend") },
              ].map((ins, i) => (
                <div key={i} style={{ background: ins.bg, border: `1px solid ${ins.color}22`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{ins.icon}</span>
                  <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
