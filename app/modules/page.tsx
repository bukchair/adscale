"use client";
import { useState } from "react";
import { useDashboard, getDaysAgo, getToday } from "@/hooks/useDashboard";
import { C } from "./theme";
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
import SEOModule from "./seo/SEOModule";
import ProductsModule from "./products/ProductsModule";

export type Lang = "he" | "en";

/* ── Navigation items ──────────────────────────────────────────── */
const NAV_ITEMS = [
  // group: performance
  { id: "overview",          icon: "📊", he: "סקירה כללית",    en: "Overview",            group: "performance" },
  { id: "profitability",     icon: "💰", he: "רווחיות",        en: "Profitability",       group: "performance" },
  { id: "budget",            icon: "📈", he: "ניהול תקציב",    en: "Budget Control",      group: "performance" },
  // group: campaigns
  { id: "recommendations",   icon: "🤖", he: "המלצות AI",      en: "AI Recommendations",  group: "campaigns" },
  { id: "search-terms",      icon: "🔍", he: "ניתוח חיפושים",  en: "Search Intelligence", group: "campaigns" },
  { id: "negative-keywords", icon: "🚫", he: "מילות שליליות",   en: "Negative Keywords",   group: "campaigns" },
  // group: growth
  { id: "seo",               icon: "🎯", he: "מרכז SEO / GEO",  en: "SEO / GEO Center",   group: "growth" },
  { id: "products",          icon: "🛍️", he: "מוצרים",          en: "Products",            group: "growth" },
  { id: "creative-lab",      icon: "✍️", he: "Creative Lab",    en: "Creative Lab",        group: "growth" },
  // group: manage
  { id: "approvals",         icon: "✅", he: "אישורים",         en: "Approvals",           group: "manage" },
  { id: "automation",        icon: "⚙️", he: "אוטומציה",       en: "Automation",          group: "manage" },
  { id: "audit-log",         icon: "📋", he: "יומן פעולות",     en: "Audit Log",           group: "manage" },
  { id: "integrations",      icon: "🔗", he: "חיבורים",        en: "Integrations",        group: "manage" },
] as const;

type TabId = typeof NAV_ITEMS[number]["id"];

const NAV_GROUPS = {
  he: [
    { id: "performance", label: "ביצועים" },
    { id: "campaigns",   label: "קמפיינים" },
    { id: "growth",      label: "צמיחה" },
    { id: "manage",      label: "ניהול" },
  ],
  en: [
    { id: "performance", label: "Performance" },
    { id: "campaigns",   label: "Campaigns" },
    { id: "growth",      label: "Growth" },
    { id: "manage",      label: "Manage" },
  ],
};

const DATE_PRESETS = [
  { he: "7 ימים",  en: "7d",  days: 7 },
  { he: "14 ימים", en: "14d", days: 14 },
  { he: "30 ימים", en: "30d", days: 30 },
];

// Badge counts per tab (notifications)
const BADGES: Partial<Record<TabId, { count: number; color: string }>> = {
  approvals:         { count: 5,  color: C.amber },
  seo:               { count: 12, color: C.red   },
  "negative-keywords": { count: 8, color: C.orange },
};

/* ── Sidebar component ─────────────────────────────────────────── */
function Sidebar({ lang, active, onSelect }: {
  lang: Lang;
  active: TabId;
  onSelect: (id: TabId) => void;
}) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const groups = NAV_GROUPS[lang];

  const navItem = (item: typeof NAV_ITEMS[number]) => {
    const isActive = active === item.id;
    const badge = BADGES[item.id];
    return (
      <button
        key={item.id}
        onClick={() => onSelect(item.id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: isActive ? C.sidebarActive : "transparent",
          color: isActive ? C.sidebarActiveText : C.sidebarText,
          fontSize: 13,
          fontWeight: isActive ? 600 : 400,
          textAlign: "start",
          transition: "background 0.12s, color 0.12s",
          marginBottom: 2,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lang === "he" ? item.he : item.en}
        </span>
        {badge && (
          <span style={{
            background: badge.color, color: "#fff", fontSize: 10, fontWeight: 700,
            borderRadius: 10, padding: "1px 6px", flexShrink: 0,
          }}>{badge.count}</span>
        )}
      </button>
    );
  };

  return (
    <aside style={{
      width: 240,
      background: C.sidebar,
      borderRight: `1px solid ${C.sidebarBorder}`,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{
        padding: "18px 16px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>🤖</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>AdScale</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>AI Growth OS</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {groups.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group.id);
          return (
            <div key={group.id} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.textMuted,
                textTransform: "uppercase", letterSpacing: "0.07em",
                padding: "0 10px 6px",
              }}>{group.label}</div>
              {items.map(navItem)}
            </div>
          );
        })}
      </nav>

      {/* Lang toggle */}
      <div style={{ padding: "12px 8px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, padding: "0 10px 6px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {t("שפה", "Language")}
        </div>
        <div style={{ display: "flex", gap: 6, padding: "0 2px" }}>
          {(["he", "en"] as const).map(l => (
            <button
              key={l}
              onClick={() => { /* lang change handled externally */ }}
              disabled
              style={{
                flex: 1, padding: "6px", borderRadius: 6, border: `1px solid ${C.border}`,
                background: lang === l ? C.accentLight : "transparent",
                color: lang === l ? C.accent : C.textMuted,
                fontSize: 12, fontWeight: lang === l ? 700 : 400, cursor: "default",
              }}
            >{l === "he" ? "🇮🇱 עברית" : "🇺🇸 English"}</button>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [lang, setLang] = useState<Lang>("he");
  const [preset, setPreset] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const dir = lang === "he" ? "rtl" : "ltr";
  const t = (he: string, en: string) => lang === "he" ? he : en;

  const { data, loading, refetch } = useDashboard(
    getDaysAgo(DATE_PRESETS[preset].days),
    getToday()
  );
  const summary = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };
  const isLive = data?.isLive ?? false;

  const activeItem = NAV_ITEMS.find(i => i.id === activeTab)!;

  const handleSelect = (id: TabId) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  const BOTTOM_TABS: TabId[] = ["overview", "recommendations", "seo", "products", "integrations"];

  return (
    <div className="as-app" style={{ direction: dir }}>

      {/* ── Desktop Sidebar ───────────────────────────────────────── */}
      <div className="as-sidebar-wrapper">
        <Sidebar lang={lang} active={activeTab} onSelect={handleSelect} />
      </div>

      {/* ── Mobile drawer overlay ─────────────────────────────────── */}
      <div
        className={`as-sidebar-overlay ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />
      <div className={`as-sidebar-drawer ${dir === "rtl" ? "rtl" : ""} ${drawerOpen ? "open" : ""}`}>
        <Sidebar lang={lang} active={activeTab} onSelect={handleSelect} />
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="as-main">

        {/* Top header bar */}
        <header style={{
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: C.shadow,
          flexShrink: 0,
        }}>
          {/* Mobile hamburger */}
          <button
            className="as-mobile-only"
            onClick={() => setDrawerOpen(true)}
            style={{
              padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: "transparent", cursor: "pointer", fontSize: 18, color: C.textSub,
            }}
          >☰</button>

          {/* Mobile logo */}
          <div className="as-mobile-only" style={{ flex: 1, fontSize: 16, fontWeight: 700, color: C.text }}>
            🤖 AdScale
          </div>

          {/* Desktop: breadcrumb */}
          <div className="as-desktop-only" style={{ flex: 1, alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>AdScale</span>
            <span style={{ fontSize: 13, color: C.textMuted, margin: "0 4px" }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              {activeItem.icon} {lang === "he" ? activeItem.he : activeItem.en}
            </span>
          </div>

          {/* Date presets */}
          <div
            className="as-desktop-only"
            style={{ background: C.pageBg, borderRadius: 8, padding: 3, gap: 2, border: `1px solid ${C.border}` }}
          >
            {DATE_PRESETS.map((p, i) => (
              <button key={i} onClick={() => setPreset(i)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: preset === i ? C.accent : "transparent",
                color: preset === i ? "#fff" : C.textSub,
                transition: "all 0.15s",
              }}>{lang === "he" ? p.he : p.en}</button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={refetch}
            style={{
              padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.card, color: C.textSub, cursor: "pointer", fontSize: 16,
            }}
            title={t("רענן", "Refresh")}
          >↻</button>

          {/* Live indicator */}
          <div className="as-desktop-only" style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, color: isLive ? C.green : C.textMuted,
            background: isLive ? C.greenLight : C.pageBg,
            padding: "4px 10px", borderRadius: 20, border: `1px solid ${isLive ? C.green + "44" : C.border}`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? C.green : C.textMuted, display: "inline-block" }} />
            {isLive ? t("חי", "Live") : t("דמו", "Demo")}
          </div>

          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            style={{
              padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.accentLight, color: C.accent, cursor: "pointer",
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            }}
          >{lang === "he" ? "🇺🇸 EN" : "🇮🇱 HE"}</button>
        </header>

        {/* Stats bar */}
        <div style={{
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 20px",
          flexShrink: 0,
        }}>
          <div className="as-stats-grid">
            {[
              { label: t("הוצאה", "Spend"),       val: `₪${Math.round(summary.totalSpent).toLocaleString()}`,    color: C.accent, icon: "💸", bg: C.accentLight },
              { label: t("הכנסה", "Revenue"),      val: `₪${Math.round(summary.totalRevenue).toLocaleString()}`, color: C.green,  icon: "💰", bg: C.greenLight  },
              { label: "ROAS",                      val: `${summary.avgRoas.toFixed(2)}x`,                        color: C.amber,  icon: "🎯", bg: C.amberLight  },
              { label: t("המרות", "Conversions"),  val: Math.round(summary.totalConversions).toLocaleString(),    color: C.blue,   icon: "📊", bg: C.blueLight   },
            ].map((m, i) => (
              <div key={i} style={{
                background: m.bg,
                border: `1px solid ${m.color}22`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="as-metric-value" style={{ fontSize: 18, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {loading ? "—" : m.val}
                  </div>
                  <div className="as-metric-label" style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{m.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module content */}
        <div className="as-content" style={{ flex: 1 }}>
          {activeTab === "overview"          && <OverviewModule lang={lang} />}
          {activeTab === "recommendations"   && <RecommendationsModule lang={lang} />}
          {activeTab === "search-terms"      && <SearchTermsModule lang={lang} />}
          {activeTab === "negative-keywords" && <NegativeKeywordsModule lang={lang} />}
          {activeTab === "profitability"     && <ProfitabilityModule lang={lang} />}
          {activeTab === "budget"            && <BudgetModule lang={lang} />}
          {activeTab === "creative-lab"      && <CreativeLabModule lang={lang} />}
          {activeTab === "seo"               && <SEOModule lang={lang} />}
          {activeTab === "products"          && <ProductsModule lang={lang} />}
          {activeTab === "approvals"         && <ApprovalsModule lang={lang} />}
          {activeTab === "audit-log"         && <AuditLogModule lang={lang} />}
          {activeTab === "automation"        && <AutomationModule lang={lang} />}
          {activeTab === "integrations"      && <IntegrationsModule lang={lang} />}
        </div>

        {/* Mobile bottom nav */}
        <nav className="as-mobile-bottom-nav">
          {BOTTOM_TABS.map(id => {
            const item = NAV_ITEMS.find(i => i.id === id)!;
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
                  color: isActive ? C.accent : C.textMuted,
                  fontSize: 10, fontWeight: isActive ? 700 : 400,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{lang === "he" ? item.he.split(" ")[0] : item.en.split(" ")[0]}</span>
              </button>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
              color: C.textMuted, fontSize: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>☰</span>
            <span>{t("עוד", "More")}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
