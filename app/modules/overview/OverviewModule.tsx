"use client";
import { useState, useEffect } from "react";
import { api } from "@/app/lib/api-client";
import type { Lang } from "../page";

interface OverviewStats {
  totalAdSpend: number; totalRevenue: number; totalNetProfit: number;
  overallRoas: number; overallPoas: number; profitableCampaigns: number;
  unprofitableCampaigns: number; pendingApprovals: number; activeAlerts: number; classifiedToday: number;
}

const StatCard = ({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) => (
  <div style={{ background: "#1a1a2e", border: `1px solid ${color}33`, borderRadius: 12, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "12px 12px 0 0" }} />
    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{value}</div>
    <div style={{ fontSize: 13, color: "#8888aa", marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: color, marginTop: 6 }}>{sub}</div>}
  </div>
);

const AlertBadge = ({ type, message }: { type: "warning" | "error" | "info" | "success"; message: string }) => {
  const colors = { warning: "#f59e0b", error: "#ef4444", info: "#3b82f6", success: "#10b981" };
  return (
    <div style={{ background: `${colors[type]}11`, border: `1px solid ${colors[type]}44`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ color: colors[type], fontSize: 16 }}>{type === "warning" ? "⚠️" : type === "error" ? "🚨" : type === "success" ? "✅" : "ℹ️"}</span>
      <span style={{ fontSize: 13, color: "#d0d0f0" }}>{message}</span>
    </div>
  );
};

export default function OverviewModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.loadAuth();
    setLoading(false);
    setStats({ totalAdSpend: 12450.60, totalRevenue: 89340.00, totalNetProfit: 31200.40, overallRoas: 7.17, overallPoas: 2.50, profitableCampaigns: 8, unprofitableCampaigns: 2, pendingApprovals: 5, activeAlerts: 3, classifiedToday: 847 });
  }, []);

  if (loading) return <LoadingSkeleton />;
  const s = stats!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label={t("הוצאה כוללת", "Total Ad Spend")} value={`₪${s.totalAdSpend.toLocaleString()}`} color="#7c74ff" icon="💸" />
        <StatCard label={t("הכנסה", "Revenue")} value={`₪${s.totalRevenue.toLocaleString()}`} color="#00d4aa" icon="💰" />
        <StatCard label={t("רווח נקי", "Net Profit")} value={`₪${s.totalNetProfit.toLocaleString()}`} sub={t("+18.2% לחודש שעבר", "+18.2% vs last month")} color="#10b981" icon="📈" />
        <StatCard label="ROAS" value={`${s.overallRoas.toFixed(2)}x`} color="#f59e0b" icon="🎯" />
        <StatCard label="POAS" value={`${s.overallPoas.toFixed(2)}x`} sub={t("רווח על הוצאת פרסום", "Profit on Ad Spend")} color="#a78bfa" icon="🏆" />
        <StatCard label={t("קמפיינים רווחיים", "Profitable Campaigns")} value={String(s.profitableCampaigns)} sub={`${s.unprofitableCampaigns} ${t("לא רווחיים", "unprofitable")}`} color="#10b981" icon="✅" />
        <StatCard label={t("ממתינים לאישור", "Pending Approvals")} value={String(s.pendingApprovals)} color="#f59e0b" icon="⏳" />
        <StatCard label={t("שאילתות מסווגות", "Queries Classified")} value={s.classifiedToday.toLocaleString()} sub={t("היום", "Today")} color="#3b82f6" icon="🔍" />
      </div>

      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>🚨 {t("התראות פעילות", "Active Alerts")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AlertBadge type="error" message={t("קמפיין 'Shopping - כל המוצרים' הפסיד ₪2,340 ב-7 ימים האחרונים — ממליץ לבצע אופטימיזציה מיידית", "'Shopping - All Products' lost ₪2,340 in the last 7 days — immediate optimization recommended")} />
          <AlertBadge type="warning" message={t("3 קמפיינים חורגים מהתקציב היומי ב-15%+ — בדוק את חלוקת התקציב", "3 campaigns exceeding daily budget by 15%+ — review budget allocation")} />
          <AlertBadge type="warning" message={t("847 שאילתות חיפוש ממתינות לסיווג AI — הפעל מנוע סיווג", "847 search queries awaiting AI classification — run classification engine")} />
          <AlertBadge type="success" message={t("מנוע אופטימיזציה זיהה 12 מילות מפתח שליליות חדשות — ₪890 חיסכון פוטנציאלי", "Optimization engine identified 12 new negative keywords — ₪890 potential savings")} />
        </div>
      </div>

      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>⚡ {t("פעולות מהירות", "Quick Actions")}</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { he: "🤖 הפעל ניתוח AI",     en: "🤖 Run AI Analysis",         color: "#7c74ff" },
            { he: "🔍 סווג שאילתות",       en: "🔍 Classify Queries",        color: "#3b82f6" },
            { he: "✅ אשר המלצות ממתינות", en: "✅ Approve Pending Actions", color: "#10b981" },
            { he: "📊 הפק דוח רווחיות",   en: "📊 Generate Profit Report",  color: "#f59e0b" },
          ].map((btn) => (
            <button key={btn.en} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${btn.color}44`, background: `${btn.color}11`, color: btn.color, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {t(btn.he, btn.en)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="as-stats-grid" style={{ gap: 16 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ background: "#1a1a2e", borderRadius: 12, padding: 20, height: 100, animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );
}
