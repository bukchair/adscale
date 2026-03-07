"use client";
import { useState } from "react";
import { useDashboard, getDaysAgo, getToday } from "@/hooks/useDashboard";
import OverviewModule from "./overview/OverviewModule";
import RecommendationsModule from "./recommendations/RecommendationsModule";
import SearchTermsModule from "./search-terms/SearchTermsModule";
import NegativeKeywordsModule from "./negative-keywords/NegativeKeywordsModule";
import ProfitabilityModule from "./profitability/ProfitabilityModule";
import BudgetModule from "./budget/BudgetModule";
import CreativeLabModule from "./creative-lab/CreativeLabModule";
import ApprovalsModule from "./approvals/ApprovalsModule";
import AuditLogModule from "./audit-log/AuditLogModule";
import AutomationModule from "./automation/AutomationModule";
import IntegrationsModule from "./integrations/IntegrationsModule";

export type Lang = "he" | "en";

const TABS = [
  { id: "overview",          he: "📊 סקירה כללית",         en: "📊 Overview" },
  { id: "recommendations",   he: "🤖 המלצות AI",           en: "🤖 AI Recommendations" },
  { id: "search-terms",      he: "🔍 ניתוח חיפושים",       en: "🔍 Search Intelligence" },
  { id: "negative-keywords", he: "🚫 מילות שליליות",        en: "🚫 Negative Keywords" },
  { id: "profitability",     he: "💰 רווחיות",             en: "💰 Profitability" },
  { id: "budget",            he: "📈 ניהול תקציב",         en: "📈 Budget Control" },
  { id: "creative-lab",      he: "✍️ קריאייטיב",           en: "✍️ Creative Lab" },
  { id: "approvals",         he: "✅ אישורים",             en: "✅ Approvals" },
  { id: "audit-log",         he: "📋 יומן פעולות",         en: "📋 Audit Log" },
  { id: "automation",        he: "⚙️ אוטומציה",           en: "⚙️ Automation" },
  { id: "integrations",      he: "🔗 חיבורים",            en: "🔗 Integrations" },
];

const DATE_PRESETS_HE = [
  { label: "7 ימים",  days: 7 },
  { label: "14 ימים", days: 14 },
  { label: "30 ימים", days: 30 },
];
const DATE_PRESETS_EN = [
  { label: "7 days",  days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lang, setLang] = useState<Lang>("he");
  const [preset, setPreset] = useState(0);

  const dir = lang === "he" ? "rtl" : "ltr";
  const PRESETS = lang === "he" ? DATE_PRESETS_HE : DATE_PRESETS_EN;
  const from = getDaysAgo(PRESETS[preset].days);
  const to = getToday();

  const { data, loading, refetch } = useDashboard(from, to);
  const summary = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };
  const isLive = data?.isLive ?? false;

  const t = (he: string, en: string) => lang === "he" ? he : en;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Segoe UI', sans-serif", direction: dir }}>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderBottom: "1px solid #2a2a4a", padding: "16px 24px" }}>
        {/* Row 1: Logo + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #7c74ff, #00d4aa)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>AdScale AI</div>
            <div style={{ fontSize: 11, color: isLive ? "#00d4aa" : "#8888aa", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#00d4aa" : "#8888aa", display: "inline-block" }} />
              {isLive ? t("נתונים חיים", "Live data") : t("מצב דמו — חבר API Keys לנתונים אמיתיים", "Demo mode — connect API Keys for live data")}
            </div>
          </div>

          {/* Date presets */}
          <div style={{ display: "flex", background: "#0d0d1a55", borderRadius: 10, padding: 3, gap: 2 }}>
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => setPreset(i)} style={{
                padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: preset === i ? "#7c74ff" : "transparent",
                color: preset === i ? "#fff" : "#8888aa",
                transition: "all 0.15s",
              }}>{p.label}</button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={refetch} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#13132a", color: "#8888aa", cursor: "pointer", fontSize: 16 }} title={t("רענן", "Refresh")}>
            ↻
          </button>

          {/* Lang toggle */}
          <button onClick={() => setLang(lang === "he" ? "en" : "he")} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid #3a3a5a", background: "#13132a", color: "#e0e0ff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {lang === "he" ? "🇺🇸 EN" : "🇮🇱 HE"}
          </button>
        </div>

        {/* Row 2: Live stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: t("הוצאה כוללת", "Total Spend"),  val: `₪${Math.round(summary.totalSpent).toLocaleString()}`,      color: "#7c74ff", icon: "💸" },
            { label: t("הכנסה",        "Revenue"),       val: `₪${Math.round(summary.totalRevenue).toLocaleString()}`,   color: "#00d4aa", icon: "💰" },
            { label: t("ROAS ממוצע",   "Avg ROAS"),      val: `${summary.avgRoas.toFixed(2)}x`,                          color: "#f59e0b", icon: "🎯" },
            { label: t("המרות",        "Conversions"),   val: Math.round(summary.totalConversions).toLocaleString(),      color: "#3b82f6", icon: "📊" },
          ].map((m, i) => (
            <div key={i} style={{ background: "#13132a", border: `1px solid ${m.color}33`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                  {loading ? "..." : m.val}
                </div>
                <div style={{ fontSize: 11, color: "#8888aa", marginTop: 1 }}>{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: "#13132a", borderBottom: "1px solid #2a2a4a", overflowX: "auto" }}>
        <div style={{ display: "flex", padding: "0 16px", minWidth: "max-content", direction: "ltr" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "13px 15px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? "#7c74ff" : "#8888aa",
                borderBottom: activeTab === tab.id ? "2px solid #7c74ff" : "2px solid transparent",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {lang === "he" ? tab.he : tab.en}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "24px 32px" }}>
        {activeTab === "overview"          && <OverviewModule lang={lang} />}
        {activeTab === "recommendations"   && <RecommendationsModule lang={lang} />}
        {activeTab === "search-terms"      && <SearchTermsModule lang={lang} />}
        {activeTab === "negative-keywords" && <NegativeKeywordsModule lang={lang} />}
        {activeTab === "profitability"     && <ProfitabilityModule lang={lang} />}
        {activeTab === "budget"            && <BudgetModule lang={lang} />}
        {activeTab === "creative-lab"      && <CreativeLabModule lang={lang} />}
        {activeTab === "approvals"         && <ApprovalsModule lang={lang} />}
        {activeTab === "audit-log"         && <AuditLogModule lang={lang} />}
        {activeTab === "automation"        && <AutomationModule lang={lang} />}
        {activeTab === "integrations"      && <IntegrationsModule lang={lang} />}
      </div>
    </div>
  );
}
