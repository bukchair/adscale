"use client";
import { useState } from "react";
import { C } from "../theme";
import type { Lang } from "../page";

const CAMPAIGNS = [
  { name: "Shopping - Best Sellers", spend: 3420, revenue: 28900, cogs: 14450, shipping: 1200, fees: 289, profit: 9541, roas: 8.45, poas: 2.79, margin: 33.0, score: 88 },
  { name: "Search - Brand",          spend: 890,  revenue: 12400, cogs: 6200,  shipping: 520,  fees: 124, profit: 4666, roas: 13.93, poas: 5.24, margin: 37.6, score: 94 },
  { name: "Meta - Remarketing",      spend: 2100, revenue: 18900, cogs: 9450,  shipping: 780,  fees: 189, profit: 6381, roas: 9.0,   poas: 3.04, margin: 33.8, score: 82 },
  { name: "Google - Competitors",    spend: 1840, revenue: 7200,  cogs: 3600,  shipping: 340,  fees: 72,  profit: -652, roas: 3.91,  poas: -0.35, margin: -9.1, score: 23 },
  { name: "Shopping - All Products", spend: 4200, revenue: 21800, cogs: 10900, shipping: 980,  fees: 218, profit: 5502, roas: 5.19,  poas: 1.31, margin: 25.2, score: 65 },
];
const MONTHLY = [
  { m: "Jan", revenue: 38200, spend: 7200, cogs: 14900, profit: 16100, roas: 5.31 },
  { m: "Feb", revenue: 41800, spend: 8100, cogs: 16200, profit: 17500, roas: 5.16 },
  { m: "Mar", revenue: 52400, spend: 10200, cogs: 20400, profit: 21800, roas: 5.14 },
  { m: "Apr", revenue: 48700, spend: 9400,  cogs: 19200, profit: 20100, roas: 5.18 },
  { m: "May", revenue: 61200, spend: 11800, cogs: 23800, profit: 25600, roas: 5.19 },
  { m: "Jun", revenue: 58900, spend: 11200, cogs: 22900, profit: 24800, roas: 5.26 },
];
const PLATFORM_DATA = [
  { platform: "Google Ads", icon: "🔵", revenue: 48200, spend: 9800, roas: 4.92, cpa: 34.5 },
  { platform: "Meta Ads",   icon: "🔷", revenue: 31400, spend: 7200, roas: 4.36, cpa: 36.4 },
  { platform: "TikTok Ads", icon: "🎵", revenue: 14600, spend: 3900, roas: 3.74, cpa: 44.8 },
];
const getScoreColor = (s: number) => s >= 70 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";
const fmt = (n: number) => Math.round(n).toLocaleString();

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return s.includes(",") ? `"${s}"` : s; };
  const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function AIInsights({ t }: { t: (he: string, en: string) => string }) {
  return (
    <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))", border: `1px solid ${C.accentA}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 10 }}>✨ Gemini {t("תובנות","Insights")}</div>
      {[
        t("🎯 'Search - Brand' POAS 5.24x — מומלץ להגדיל תקציב 30%", "🎯 'Search - Brand' POAS 5.24x — recommend scaling budget 30%"),
        t("⚠️ 'Google - Competitors' הפסיד ₪652 — עצור מיד", "⚠️ 'Google - Competitors' lost ₪652 — pause immediately"),
        t("📈 ROAS כולל עלה מ-4.2x ל-5.1x החודש", "📈 Overall ROAS up from 4.2x to 5.1x this period"),
        t("💡 הזדמנות: הגדל רווח ב-₪8,400/חודש ע\"י ייעול תקציבים", "💡 Opportunity: +₪8,400/month profit via budget optimization"),
      ].map((ins, i) => (
        <div key={i} style={{ fontSize: 13, color: C.textSub, padding: "6px 10px", background: C.card, borderRadius: 8, lineHeight: 1.5, marginBottom: 5 }}>{ins}</div>
      ))}
    </div>
  );
}

/* ── Tab 1: Profitability ─────────────────────────────────────── */
function ProfitabilityTab({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [sortBy, setSortBy] = useState<"profit"|"poas"|"roas"|"margin"|"spend">("profit");
  const sorted = [...CAMPAIGNS].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));
  const totals = CAMPAIGNS.reduce((acc, c) => ({ spend: acc.spend + c.spend, revenue: acc.revenue + c.revenue, profit: acc.profit + c.profit, cogs: acc.cogs + c.cogs }), { spend: 0, revenue: 0, profit: 0, cogs: 0 });
  const rec = (c: typeof CAMPAIGNS[0]) => c.profit < 0 ? t("⛔ עצור","⛔ Stop") : c.poas > 2 ? t("🚀 הגדל","🚀 Scale") : t("✅ תחזוק","✅ Maintain");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        {[
          { l: t("הוצאה כוללת","Total Spend"),  v: `₪${fmt(totals.spend)}`,   c: C.accent },
          { l: t("הכנסה","Revenue"),             v: `₪${fmt(totals.revenue)}`, c: C.green  },
          { l: t("עלות מוצרים","COGS"),          v: `₪${fmt(totals.cogs)}`,    c: C.amber  },
          { l: t("רווח נקי","Net Profit"),       v: `₪${fmt(totals.profit)}`,  c: totals.profit >= 0 ? C.green : C.red },
          { l: "POAS",                            v: `${(totals.profit/totals.spend).toFixed(2)}x`, c: C.purple },
        ].map(k => (
          <div key={k.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, fontSize: 12, color: C.textMuted }}>
        <span style={{ color: C.accent, fontWeight: 600 }}>📐 {t("נוסחת רווח","Profit Formula")}: </span>
        {t("הכנסה − פרסום − עלות מוצר − משלוח − עמלות = ","Revenue − Ad Spend − COGS − Shipping − Fees = ")}
        <span style={{ color: C.green, fontWeight: 600 }}>{t("רווח נקי","Net Profit")}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "7px 12px", fontSize: 13 }}>
          <option value="profit">{t("לפי רווח","By Profit")}</option>
          <option value="poas">By POAS</option>
          <option value="roas">By ROAS</option>
          <option value="margin">{t("לפי מרג'ין","By Margin")}</option>
          <option value="spend">{t("לפי הוצאה","By Spend")}</option>
        </select>
      </div>
      <div className="as-profit-table-wrap" style={{ background: C.card }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr style={{ background: C.cardAlt }}>
              {[t("קמפיין","Campaign"),t("ציון","Score"),t("הוצאה","Spend"),t("הכנסה","Revenue"),"COGS",t("רווח","Profit"),"Margin","ROAS","POAS",t("פעולה","Action")].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "start", color: C.textMuted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 14px", color: C.text, fontWeight: 500, whiteSpace: "nowrap" }}>{c.name}</td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 30, height: 5, background: C.border, borderRadius: 2 }}><div style={{ width: `${c.score}%`, height: "100%", background: getScoreColor(c.score), borderRadius: 2 }} /></div>
                    <span style={{ color: getScoreColor(c.score), fontWeight: 700, fontSize: 11 }}>{c.score}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 14px", color: C.text }}>₪{fmt(c.spend)}</td>
                <td style={{ padding: "10px 14px", color: C.green }}>₪{fmt(c.revenue)}</td>
                <td style={{ padding: "10px 14px", color: C.amber }}>₪{fmt(c.cogs)}</td>
                <td style={{ padding: "10px 14px", color: c.profit >= 0 ? C.green : C.red, fontWeight: 700 }}>{c.profit >= 0 ? "+" : ""}₪{fmt(c.profit)}</td>
                <td style={{ padding: "10px 14px", color: c.margin >= 0 ? C.green : C.red }}>{c.margin.toFixed(1)}%</td>
                <td style={{ padding: "10px 14px", color: C.text }}>{c.roas.toFixed(2)}x</td>
                <td style={{ padding: "10px 14px", color: c.poas >= 1 ? C.green : c.poas >= 0 ? C.amber : C.red, fontWeight: 600 }}>{c.poas.toFixed(2)}x</td>
                <td style={{ padding: "10px 14px", fontSize: 11, color: c.profit >= 0 ? C.green : C.red }}>{rec(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AIInsights t={t} />
    </div>
  );
}

/* ── Tab 2: Financial Reports ─────────────────────────────────── */
function FinancialReportsTab({ lang, dateFrom, dateTo }: { lang: Lang; dateFrom: string; dateTo: string }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const totals = MONTHLY.reduce((a, m) => ({ revenue: a.revenue + m.revenue, spend: a.spend + m.spend, profit: a.profit + m.profit, cogs: a.cogs + m.cogs }), { revenue: 0, spend: 0, profit: 0, cogs: 0 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>{t("טווח","Range")}: {dateFrom || "—"} → {dateTo || "—"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportCSV("financial-report.csv",
              ["Month","Revenue","Ad Spend","COGS","Net Profit","ROAS"],
              MONTHLY.map(m => [m.m, m.revenue, m.spend, m.cogs, m.profit, m.roas.toFixed(2)]))}
            style={{ padding: "7px 14px", borderRadius: 8, background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            📥 {t("ייצוא CSV","Export CSV")}
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        {[
          { l: t("הכנסה כוללת","Total Revenue"), v: `₪${fmt(totals.revenue)}`, c: C.green  },
          { l: t("הוצאת פרסום","Ad Spend"),      v: `₪${fmt(totals.spend)}`,   c: C.accent },
          { l: "COGS",                             v: `₪${fmt(totals.cogs)}`,    c: C.amber  },
          { l: t("רווח נקי","Net Profit"),        v: `₪${fmt(totals.profit)}`,  c: C.green  },
          { l: "ROAS",                             v: `${(totals.revenue / totals.spend).toFixed(2)}x`, c: C.blue },
        ].map(k => (
          <div key={k.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div className="as-profit-table-wrap">
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.text }}>
          📅 {t("פירוט חודשי","Monthly Breakdown")}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
          <thead>
            <tr style={{ background: C.cardAlt }}>
              {[t("חודש","Month"),t("הכנסה","Revenue"),t("הוצאה","Spend"),"COGS",t("רווח","Profit"),"ROAS",t("מרג'ין","Margin")].map(h => (
                <th key={h} style={{ padding: "9px 14px", textAlign: "start", color: C.textMuted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHLY.map((m, i) => {
              const margin = ((m.profit / m.revenue) * 100).toFixed(1);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "9px 14px", fontWeight: 600, color: C.text }}>{m.m}</td>
                  <td style={{ padding: "9px 14px", color: C.green }}>₪{fmt(m.revenue)}</td>
                  <td style={{ padding: "9px 14px", color: C.accent }}>₪{fmt(m.spend)}</td>
                  <td style={{ padding: "9px 14px", color: C.amber }}>₪{fmt(m.cogs)}</td>
                  <td style={{ padding: "9px 14px", color: C.green, fontWeight: 700 }}>₪{fmt(m.profit)}</td>
                  <td style={{ padding: "9px 14px", color: C.blue }}>{m.roas.toFixed(2)}x</td>
                  <td style={{ padding: "9px 14px", color: parseFloat(margin) > 30 ? C.green : C.amber }}>{margin}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>📱 {t("לפי פלטפורמה","By Platform")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          {PLATFORM_DATA.map(p => (
            <div key={p.platform} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{p.platform}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[{l:t("הכנסה","Revenue"),v:`₪${fmt(p.revenue)}`,c:C.green},{l:t("הוצאה","Spend"),v:`₪${fmt(p.spend)}`,c:C.accent},{l:"ROAS",v:`${p.roas.toFixed(2)}x`,c:C.blue},{l:"CPA",v:`₪${p.cpa}`,c:C.amber}].map(kv => (
                  <div key={kv.l}><div style={{ fontSize: 14, fontWeight: 700, color: kv.c }}>{kv.v}</div><div style={{ fontSize: 10, color: C.textMuted }}>{kv.l}</div></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <AIInsights t={t} />
    </div>
  );
}

/* ── Root ──────────────────────────────────────────────────────── */
export default function ProfitabilityModule({ lang, dateFrom = "", dateTo = "" }: { lang: Lang; dateFrom?: string; dateTo?: string }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [tab, setTab] = useState<"profit"|"reports">("profit");
  const TABS = [
    { id: "profit",  label: t("רווחיות","Profitability"),         icon: "💰" },
    { id: "reports", label: t("דוחות כספיים","Financial Reports"), icon: "📊" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="as-tab-scroll" style={{ gap: 0, borderBottom: `1px solid ${C.border}`, background: C.card, padding: "0 12px" }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: "12px 18px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === tb.id ? 700 : 400,
            color: tab === tb.id ? C.accent : C.textMuted,
            borderBottom: `2px solid ${tab === tb.id ? C.accent : "transparent"}`,
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap",
          }}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 20 }}>
        {tab === "profit"  && <ProfitabilityTab lang={lang} />}
        {tab === "reports" && <FinancialReportsTab lang={lang} dateFrom={dateFrom} dateTo={dateTo} />}
      </div>
    </div>
  );
}
