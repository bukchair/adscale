"use client";
import { useState } from "react";
import type { Lang } from "../page";

const CAMPAIGNS = [
  { name: "Shopping - Best Sellers", dailyBudget: 500, avgSpend: 340, pacingRate: 0.68, pacingStatus: "underspending", roas: 8.45, profit: 1362, change: +100, risk: "low" },
  { name: "Search - Brand",          dailyBudget: 150, avgSpend: 175, pacingRate: 1.17, pacingStatus: "overspending",  roas: 13.93, profit: 667, change: -30,  risk: "medium" },
  { name: "Meta - Remarketing",      dailyBudget: 300, avgSpend: 298, pacingRate: 0.99, pacingStatus: "on_pace",       roas: 9.0,   profit: 912, change: 0,    risk: "low" },
  { name: "Google - Competitors",    dailyBudget: 250, avgSpend: 263, pacingRate: 1.05, pacingStatus: "overspending",  roas: 3.91,  profit: -93, change: -75,  risk: "high" },
  { name: "Shopping - All Products", dailyBudget: 600, avgSpend: 390, pacingRate: 0.65, pacingStatus: "underspending", roas: 5.19,  profit: 786, change: +120, risk: "low" },
];

export default function BudgetModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [budgets, setBudgets] = useState(CAMPAIGNS);
  const [applying, setApplying] = useState(false);

  const STATUS_CONFIG = {
    on_pace:        { color: "#10b981", label: t("בקצב תקין", "On Pace"),        icon: "✅" },
    underspending:  { color: "#3b82f6", label: t("חסר תקציב", "Underspending"),  icon: "⬇️" },
    overspending:   { color: "#f97316", label: t("חורג מתקציב", "Overspending"), icon: "⬆️" },
    budget_exhausted: { color: "#ef4444", label: t("תקציב אזל", "Budget Exhausted"), icon: "🚫" },
  };

  const RISK_LABELS: Record<string, string> = { low: t("נמוך", "Low"), medium: t("בינוני", "Medium"), high: t("גבוה", "High") };

  const applyAll = async () => {
    setApplying(true);
    await new Promise((r) => setTimeout(r, 1500));
    setBudgets((prev) => prev.map((c) => ({ ...c, dailyBudget: c.dailyBudget + c.change, change: 0 })));
    setApplying(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="as-stats-grid">
        {[
          { label: t("תקציב יומי כולל", "Total Daily Budget"),   value: `₪${CAMPAIGNS.reduce((s, c) => s + c.dailyBudget, 0).toLocaleString()}`, color: "#6366f1" },
          { label: t("הוצאה ממוצעת/יום", "Avg Spend/Day"),       value: `₪${CAMPAIGNS.reduce((s, c) => s + c.avgSpend, 0).toLocaleString()}`,    color: "#10b981" },
          { label: t("ניצול תקציב", "Budget Utilization"),       value: `${Math.round(CAMPAIGNS.reduce((s, c) => s + c.avgSpend, 0) / CAMPAIGNS.reduce((s, c) => s + c.dailyBudget, 0) * 100)}%`, color: "#f59e0b" },
          { label: t("שינויים מוצעים", "Suggested Changes"),     value: `${CAMPAIGNS.filter((c) => c.change !== 0).length} ${t("קמפיינים", "campaigns")}`, color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#ffffff", border: `1px solid ${c.color}33`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          🤖 {t("ייצר המלצות תקציב", "Generate Budget Recommendations")}
        </button>
        {budgets.some((c) => c.change !== 0) && (
          <button onClick={applyAll} disabled={applying} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {applying ? t("🔄 מיישם...", "🔄 Applying...") : `✅ ${t("יישם כל השינויים", "Apply All Changes")}`}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {budgets.map((c, i) => {
          const status = STATUS_CONFIG[c.pacingStatus as keyof typeof STATUS_CONFIG];
          const newBudget = c.dailyBudget + c.change;
          return (
            <div key={i} style={{ background: "#ffffff", border: `1px solid ${status.color}33`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>{status.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{c.name}</span>
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${status.color}22`, color: status.color, fontWeight: 600 }}>{status.label}</span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                      <span>{t("ניצול תקציב", "Budget Utilization")}: {Math.round(c.pacingRate * 100)}%</span>
                      <span>₪{c.avgSpend} / ₪{c.dailyBudget}</span>
                    </div>
                    <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "visible" }}>
                      <div style={{ width: `${Math.min(100, c.pacingRate * 100)}%`, height: "100%", background: c.pacingRate > 1.1 ? "#f97316" : c.pacingRate < 0.7 ? "#3b82f6" : "#10b981", borderRadius: 4, transition: "width 0.5s" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#a0a0c0" }}>
                    <span>ROAS: <strong style={{ color: c.roas >= 4 ? "#10b981" : "#f59e0b" }}>{c.roas}x</strong></span>
                    <span>{t("רווח יומי", "Daily Profit")}: <strong style={{ color: c.profit >= 0 ? "#10b981" : "#ef4444" }}>₪{c.profit}</strong></span>
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 20px", minWidth: 180, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{t("המלצה", "Recommendation")}</div>
                  {c.change === 0 ? (
                    <span style={{ color: "#10b981", fontWeight: 600 }}>✅ {t("אין שינוי", "No Change")}</span>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: "#64748b" }}>₪{c.dailyBudget} → <strong style={{ color: "#fff" }}>₪{newBudget}</strong></div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c.change > 0 ? "#10b981" : "#ef4444", marginTop: 4 }}>
                        {c.change > 0 ? "↑" : "↓"} ₪{Math.abs(c.change)} ({c.change > 0 ? "+" : ""}{Math.round((c.change / c.dailyBudget) * 100)}%)
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        {t("סיכון", "Risk")}: <span style={{ color: c.risk === "low" ? "#10b981" : c.risk === "medium" ? "#f59e0b" : "#ef4444" }}>{RISK_LABELS[c.risk]}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
