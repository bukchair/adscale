"use client";
import { useState } from "react";
import type { Lang } from "../page";

const CAMPAIGNS = [
  { name: "Shopping - Best Sellers", spend: 3420, revenue: 28900, cogs: 14450, shipping: 1200, fees: 289, profit: 9541, roas: 8.45, poas: 2.79, margin: 33.0, score: 88 },
  { name: "Search - Brand",          spend: 890,  revenue: 12400, cogs: 6200,  shipping: 520,  fees: 124, profit: 4666, roas: 13.93, poas: 5.24, margin: 37.6, score: 94 },
  { name: "Meta - Remarketing",      spend: 2100, revenue: 18900, cogs: 9450,  shipping: 780,  fees: 189, profit: 6381, roas: 9.0,   poas: 3.04, margin: 33.8, score: 82 },
  { name: "Google - Competitors",    spend: 1840, revenue: 7200,  cogs: 3600,  shipping: 340,  fees: 72,  profit: -652, roas: 3.91,  poas: -0.35, margin: -9.1, score: 23 },
  { name: "Shopping - All Products", spend: 4200, revenue: 21800, cogs: 10900, shipping: 980,  fees: 218, profit: 5502, roas: 5.19,  poas: 1.31, margin: 25.2, score: 65 },
];

const getScoreColor = (s: number) => s >= 70 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

export default function ProfitabilityModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [sortBy, setSortBy] = useState<keyof typeof CAMPAIGNS[0]>("profit");
  const [dateRange, setDateRange] = useState("30d");

  const sorted = [...CAMPAIGNS].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));
  const totals = CAMPAIGNS.reduce((acc, c) => ({ spend: acc.spend + c.spend, revenue: acc.revenue + c.revenue, profit: acc.profit + c.profit, cogs: acc.cogs + c.cogs }), { spend: 0, revenue: 0, profit: 0, cogs: 0 });

  const rec = (c: typeof CAMPAIGNS[0]) => c.profit < 0
    ? t("⛔ עצור הפסדים", "⛔ Stop Losses")
    : c.poas > 2
      ? t("🚀 הגדל תקציב", "🚀 Scale Budget")
      : t("✅ תחזוק", "✅ Maintain");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: t("הוצאה כוללת", "Total Spend"),    value: `₪${totals.spend.toLocaleString()}`,   color: "#6366f1" },
          { label: t("הכנסה", "Revenue"),               value: `₪${totals.revenue.toLocaleString()}`, color: "#10b981" },
          { label: t("עלות מוצרים", "Cost of Goods"),  value: `₪${totals.cogs.toLocaleString()}`,    color: "#f59e0b" },
          { label: t("רווח נקי", "Net Profit"),         value: `₪${totals.profit.toLocaleString()}`,  color: totals.profit > 0 ? "#10b981" : "#ef4444" },
          { label: t("POAS כולל", "Total POAS"),        value: `${(totals.profit / totals.spend).toFixed(2)}x`, color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#ffffff", border: `1px solid ${c.color}33`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, fontSize: 13, color: "#a0a0c0" }}>
        <span style={{ color: "#6366f1", fontWeight: 600 }}>📐 {t("נוסחת רווח", "Profit Formula")}: </span>
        {t("הכנסה − הוצאת פרסום − עלות מוצר − משלוח − עמלות פלטפורמה − החזרות = ", "Revenue − Ad Spend − COGS − Shipping − Platform Fees − Returns = ")}
        <span style={{ color: "#10b981", fontWeight: 600 }}>{t("רווח נקי", "Net Profit")}</span>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {["7d", "14d", "30d", "90d"].map((d) => (
          <button key={d} onClick={() => setDateRange(d)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: dateRange === d ? "#7c74ff" : "#ffffff", color: dateRange === d ? "#fff" : "#8888aa", cursor: "pointer", fontSize: 12 }}>{d}</button>
        ))}
        <select value={String(sortBy)} onChange={(e) => setSortBy(e.target.value as any)} style={{ marginLeft: "auto", background: "#ffffff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="profit">{t("מיין לפי רווח", "Sort by Profit")}</option>
          <option value="poas">{t("מיין לפי POAS", "Sort by POAS")}</option>
          <option value="roas">{t("מיין לפי ROAS", "Sort by ROAS")}</option>
          <option value="margin">{t("מיין לפי מרג'ין", "Sort by Margin")}</option>
          <option value="spend">{t("מיין לפי הוצאה", "Sort by Spend")}</option>
        </select>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {[t("קמפיין","Campaign"), t("ציון רווח","Profit Score"), t("הוצאה","Spend"), t("הכנסה","Revenue"), t("עלות מוצרים","COGS"), t("רווח נקי","Net Profit"), "Margin", "ROAS", "POAS", t("המלצה","Action")].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e1e3a" }}>
                <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 40, height: 8, background: "#e2e8f0", borderRadius: 4 }}><div style={{ width: `${c.score}%`, height: "100%", background: getScoreColor(c.score), borderRadius: 4 }} /></div>
                    <span style={{ color: getScoreColor(c.score), fontWeight: 600 }}>{c.score}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#1e293b" }}>₪{c.spend.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", color: "#10b981" }}>₪{c.revenue.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", color: "#f59e0b" }}>₪{c.cogs.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", color: c.profit >= 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>{c.profit >= 0 ? "+" : ""}₪{c.profit.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", color: c.margin >= 0 ? "#10b981" : "#ef4444" }}>{c.margin.toFixed(1)}%</td>
                <td style={{ padding: "12px 16px", color: "#1e293b" }}>{c.roas.toFixed(2)}x</td>
                <td style={{ padding: "12px 16px", color: c.poas >= 1 ? "#10b981" : c.poas >= 0 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>{c.poas.toFixed(2)}x</td>
                <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, color: c.profit >= 0 ? "#10b981" : "#ef4444" }}>{rec(c)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
