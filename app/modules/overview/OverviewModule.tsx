"use client";
import { useState, useEffect } from "react";
import type { Lang } from "../page";

interface DashboardSummary {
  totalSpent: number;
  totalRevenue: number;
  avgRoas: number;
  totalConversions: number;
}

interface Campaign {
  id: string;
  roas: number;
  status: string;
}

interface DashboardData {
  summary: DashboardSummary;
  campaigns: Campaign[];
  ga4: { sessions: number; users: number; revenue: number };
  apiErrors: string[];
  isLive: boolean;
  lastUpdated: string;
}

const StatCard = ({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub?: string; color: string; icon: string;
}) => (
  <div style={{ background: "#ffffff", border: `1px solid ${color}33`, borderRadius: 12, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "12px 12px 0 0" }} />
    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: "#1e293b" }}>{value}</div>
    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color, marginTop: 6 }}>{sub}</div>}
  </div>
);

const AlertBadge = ({ type, message }: { type: "warning" | "error" | "info" | "success"; message: string }) => {
  const colors = { warning: "#f59e0b", error: "#ef4444", info: "#3b82f6", success: "#10b981" };
  return (
    <div style={{ background: `${colors[type]}11`, border: `1px solid ${colors[type]}44`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ color: colors[type], fontSize: 16 }}>{type === "warning" ? "⚠️" : type === "error" ? "🚨" : type === "success" ? "✅" : "ℹ️"}</span>
      <span style={{ fontSize: 13, color: "#475569" }}>{message}</span>
    </div>
  );
};

export default function OverviewModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSkeleton />;

  const s = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };
  const campaigns = data?.campaigns ?? [];
  const netProfit   = s.totalRevenue - s.totalSpent;
  const poas        = s.totalSpent > 0 ? netProfit / s.totalSpent : 0;
  const profitable  = campaigns.filter(c => c.roas > 1 && c.status === "active").length;
  const unprofitable = campaigns.filter(c => c.roas <= 1 && c.status === "active").length;
  const ga4 = data?.ga4 ?? { sessions: 0, users: 0, revenue: 0 };

  const apiErrors = data?.apiErrors ?? [];
  const hasErrors = apiErrors.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* API errors notice */}
      {hasErrors && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fef3c7", border: "1px solid #f59e0b44", fontSize: 12, color: "#92400e" }}>
          ⚠️ {t("חלק מהמקורות לא נגישים — מוצגים נתונים חלקיים:", "Some data sources are unavailable — partial data shown:")} {apiErrors.join(", ")}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fee2e2", border: "1px solid #ef444444", fontSize: 12, color: "#7f1d1d" }}>
          ❌ {t("שגיאה בטעינת נתונים", "Error loading data")}: {error}
        </div>
      )}

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard
          label={t("הוצאה כוללת", "Total Ad Spend")}
          value={`₪${s.totalSpent.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`}
          color="#7c74ff" icon="💸"
        />
        <StatCard
          label={t("הכנסה", "Revenue")}
          value={`₪${s.totalRevenue.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`}
          color="#00d4aa" icon="💰"
        />
        <StatCard
          label={t("רווח נקי", "Net Profit")}
          value={`₪${netProfit.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`}
          sub={s.totalRevenue > 0 ? `${((netProfit / s.totalRevenue) * 100).toFixed(1)}% ${t("מרג'ין", "margin")}` : undefined}
          color={netProfit >= 0 ? "#10b981" : "#ef4444"} icon="📈"
        />
        <StatCard
          label="ROAS"
          value={`${s.avgRoas.toFixed(2)}x`}
          color="#f59e0b" icon="🎯"
        />
        <StatCard
          label="POAS"
          value={`${poas.toFixed(2)}x`}
          sub={t("רווח על הוצאת פרסום", "Profit on Ad Spend")}
          color="#a78bfa" icon="🏆"
        />
        <StatCard
          label={t("המרות", "Conversions")}
          value={s.totalConversions.toLocaleString()}
          color="#3b82f6" icon="🛒"
        />
        <StatCard
          label={t("קמפיינים רווחיים", "Profitable Campaigns")}
          value={String(profitable)}
          sub={`${unprofitable} ${t("לא רווחיים", "unprofitable")}`}
          color="#10b981" icon="✅"
        />
        <StatCard
          label={t("משתמשים (GA4)", "Users (GA4)")}
          value={ga4.users.toLocaleString()}
          sub={`${ga4.sessions.toLocaleString()} ${t("סשנים", "sessions")}`}
          color="#3b82f6" icon="👥"
        />
      </div>

      {/* Alerts */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>🚨 {t("התראות פעילות", "Active Alerts")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {unprofitable > 0 && (
            <AlertBadge type="error" message={t(
              `${unprofitable} קמפיינים פעילים עם ROAS < 1 — ממליץ לבצע אופטימיזציה`,
              `${unprofitable} active campaign(s) with ROAS < 1 — optimization recommended`
            )} />
          )}
          {s.totalSpent > 0 && s.avgRoas < 2 && (
            <AlertBadge type="warning" message={t(
              `ROAS כולל ${s.avgRoas.toFixed(2)}x — מתחת ליעד המומלץ 2x`,
              `Overall ROAS ${s.avgRoas.toFixed(2)}x — below recommended target of 2x`
            )} />
          )}
          {hasErrors && (
            <AlertBadge type="warning" message={t(
              `${apiErrors.length} מקורות נתונים לא זמינים — בדוק חיבורים`,
              `${apiErrors.length} data source(s) unavailable — check integrations`
            )} />
          )}
          {netProfit > 0 && (
            <AlertBadge type="success" message={t(
              `רווח נקי חיובי ₪${netProfit.toLocaleString("he-IL", { maximumFractionDigits: 0 })} — כל הכבוד!`,
              `Positive net profit ₪${netProfit.toLocaleString("he-IL", { maximumFractionDigits: 0 })} — great work!`
            )} />
          )}
          {s.totalSpent === 0 && !error && (
            <AlertBadge type="info" message={t(
              "לא נמצאו נתוני הוצאות — ודא שחיבורי הפרסום מוגדרים בחיבורים",
              "No spend data found — make sure ad platform integrations are configured"
            )} />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>⚡ {t("פעולות מהירות", "Quick Actions")}</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { he: "🤖 הפעל ניתוח AI",     en: "🤖 Run AI Analysis",         color: "#6366f1" },
            { he: "🔍 סווג שאילתות",       en: "🔍 Classify Queries",        color: "#3b82f6" },
            { he: "✅ אשר המלצות ממתינות", en: "✅ Approve Pending Actions", color: "#10b981" },
            { he: "📊 הפק דוח רווחיות",   en: "📊 Generate Profit Report",  color: "#f59e0b" },
          ].map((btn) => (
            <button key={btn.en} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${btn.color}44`, background: `${btn.color}11`, color: btn.color, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {t(btn.he, btn.en)}
            </button>
          ))}
        </div>
        {data?.lastUpdated && (
          <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8" }}>
            {t("עודכן", "Last updated")}: {new Date(data.lastUpdated).toLocaleTimeString(lang === "he" ? "he-IL" : "en-US")}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ background: "#ffffff", borderRadius: 12, padding: 20, height: 108, animation: "pulse 1.5s infinite", opacity: 0.6 }} />
      ))}
    </div>
  );
}
