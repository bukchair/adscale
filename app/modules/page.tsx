"use client";
import { useState } from "react";
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
  { id: "negative-keywords", he: "🚫 מילות מפתח שליליות",  en: "🚫 Negative Keywords" },
  { id: "profitability",     he: "💰 רווחיות",             en: "💰 Profitability" },
  { id: "budget",            he: "📈 ניהול תקציב",         en: "📈 Budget Control" },
  { id: "creative-lab",      he: "✍️ מעבדת קריאייטיב",    en: "✍️ Creative Lab" },
  { id: "approvals",         he: "✅ אישורים",             en: "✅ Approvals" },
  { id: "audit-log",         he: "📋 יומן פעולות",         en: "📋 Audit Log" },
  { id: "automation",        he: "⚙️ אוטומציה",           en: "⚙️ Automation" },
  { id: "integrations",      he: "🔗 חיבורים",            en: "🔗 Integrations" },
];

export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lang, setLang] = useState<Lang>("he");
  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Segoe UI', sans-serif", direction: dir }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderBottom: "1px solid #2a2a4a", padding: "20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #7c74ff, #00d4aa)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff" }}>AdScale AI</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#8888aa" }}>
              {lang === "he" ? "מנוע אופטימיזציה חכם לפרסום" : "Smart advertising optimization engine"}
            </p>
          </div>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            style={{
              padding: "7px 16px", borderRadius: 20, border: "1px solid #3a3a5a",
              background: "#13132a", color: "#e0e0ff", cursor: "pointer",
              fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {lang === "he" ? "🇺🇸 English" : "🇮🇱 עברית"}
          </button>
          <a
            href="/dashboard"
            style={{
              padding: "7px 16px", borderRadius: 20, border: "1px solid #7c74ff55",
              background: "#1a1a3a", color: "#7c74ff", cursor: "pointer",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            {lang === "he" ? "📊 דשבורד חי" : "📊 Live Dashboard"}
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#13132a", borderBottom: "1px solid #2a2a4a", overflowX: "auto" }}>
        <div style={{ display: "flex", padding: "0 16px", minWidth: "max-content", direction: "ltr" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "14px 16px",
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

      {/* Content */}
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
