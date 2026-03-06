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

const TABS = [
  { id: "overview",          label: "📊 סקירה כללית",         en: "Overview" },
  { id: "recommendations",   label: "🤖 המלצות AI",           en: "Recommendations" },
  { id: "search-terms",      label: "🔍 ניתוח חיפושים",       en: "Search Intelligence" },
  { id: "negative-keywords", label: "🚫 מילות מפתח שליליות",  en: "Negative Keywords" },
  { id: "profitability",     label: "💰 רווחיות",             en: "Profitability" },
  { id: "budget",            label: "📈 ניהול תקציב",         en: "Budget Control" },
  { id: "creative-lab",      label: "✍️ מעבדת קריאייטיב",    en: "Creative Lab" },
  { id: "approvals",         label: "✅ אישורים",             en: "Approvals" },
  { id: "audit-log",         label: "📋 יומן פעולות",         en: "Audit Log" },
  { id: "automation",        label: "⚙️ אוטומציה",           en: "Automation" },
  { id: "integrations",      label: "🔗 חיבורים",            en: "Integrations" },
];

export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderBottom: "1px solid #2a2a4a", padding: "20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #7c74ff, #00d4aa)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🤖
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff" }}>AdScale AI</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#8888aa" }}>מנוע אופטימיזציה חכם לפרסום</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#13132a", borderBottom: "1px solid #2a2a4a", overflowX: "auto" }}>
        <div style={{ display: "flex", padding: "0 16px", minWidth: "max-content" }}>
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
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        {activeTab === "overview" && <OverviewModule />}
        {activeTab === "recommendations" && <RecommendationsModule />}
        {activeTab === "search-terms" && <SearchTermsModule />}
        {activeTab === "negative-keywords" && <NegativeKeywordsModule />}
        {activeTab === "profitability" && <ProfitabilityModule />}
        {activeTab === "budget" && <BudgetModule />}
        {activeTab === "creative-lab" && <CreativeLabModule />}
        {activeTab === "approvals" && <ApprovalsModule />}
        {activeTab === "audit-log" && <AuditLogModule />}
        {activeTab === "automation" && <AutomationModule />}
        {activeTab === "integrations" && <IntegrationsModule />}
      </div>
    </div>
  );
}
