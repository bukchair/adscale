"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import AudiencesModule from "./audiences/AudiencesModule";
import UsersModule from "./users/UsersModule";
import { getUser, clearUser, getConnections, type Connection } from "../lib/auth";

export type Lang = "he" | "en";

/* ── Navigation items ──────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "overview",          icon: "📊", he: "סקירה כללית",    en: "Overview",            group: "performance" },
  { id: "profitability",     icon: "💰", he: "רווחיות",        en: "Profitability",       group: "performance" },
  { id: "budget",            icon: "📈", he: "ניהול תקציב",    en: "Budget Control",      group: "performance" },
  { id: "recommendations",   icon: "🤖", he: "המלצות AI",      en: "AI Recommendations",  group: "campaigns" },
  { id: "search-terms",      icon: "🔍", he: "ניתוח חיפושים",  en: "Search Intelligence", group: "campaigns" },
  { id: "negative-keywords", icon: "🚫", he: "מילות שליליות",   en: "Negative Keywords",   group: "campaigns" },
  { id: "seo",               icon: "🎯", he: "מרכז SEO / GEO",  en: "SEO / GEO Center",   group: "growth" },
  { id: "products",          icon: "🛍️", he: "מוצרים",          en: "Products",            group: "growth" },
  { id: "audiences",         icon: "👥", he: "קהלים",            en: "Audiences",           group: "growth" },
  { id: "creative-lab",      icon: "✍️", he: "Creative Lab",    en: "Creative Lab",        group: "growth" },
  { id: "approvals",         icon: "✅", he: "אישורים",         en: "Approvals",           group: "manage" },
  { id: "automation",        icon: "⚙️", he: "אוטומציה",       en: "Automation",          group: "manage" },
  { id: "audit-log",         icon: "📋", he: "יומן פעולות",     en: "Audit Log",           group: "manage" },
  { id: "integrations",      icon: "🔗", he: "חיבורים",        en: "Integrations",        group: "manage" },
  { id: "users",             icon: "👤", he: "משתמשים",        en: "Users & Roles",       group: "manage" },
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

const BADGES: Partial<Record<TabId, { count: number; color: string }>> = {
  approvals:           { count: 5,  color: "#f59e0b" },
  seo:                 { count: 12, color: "#ef4444"  },
  "negative-keywords": { count: 8,  color: "#f97316" },
  audiences:           { count: 1,  color: "#3b82f6"  },
};

/* ── Connection platform definitions ───────────────────────────── */
interface ConnPlatform {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  fields: string[];
  affectsHe: string[];
  affectsEn: string[];
  impactHe: string;
  impactEn: string;
  missingImpactHe: string;
  missingImpactEn: string;
}

const CONN_PLATFORMS: ConnPlatform[] = [
  {
    id: "google-ads", name: "Google Ads", shortName: "Google", icon: "🔵", color: "#4285f4",
    fields: ["customerId", "developerToken"],
    affectsHe: ["המלצות AI", "ניהול תקציב", "ניתוח חיפושים", "מילות שליליות", "רווחיות"],
    affectsEn: ["AI Recommendations", "Budget Control", "Search Intelligence", "Negative Keywords", "Profitability"],
    impactHe: "נתוני קמפיינים חיים, הוצאות, ROAS, המרות ומילות מפתח",
    impactEn: "Live campaign data, spend, ROAS, conversions and keywords",
    missingImpactHe: "כל נתוני Google Ads מוצגים כדמו. לא ניתן לנהל קמפיינים.",
    missingImpactEn: "All Google Ads data is shown as demo. Campaign management unavailable.",
  },
  {
    id: "meta-ads", name: "Meta Ads", shortName: "Meta", icon: "🔷", color: "#1877f2",
    fields: ["accessToken", "adAccountId"],
    affectsHe: ["קהלים", "Creative Lab", "אישורים"],
    affectsEn: ["Audiences", "Creative Lab", "Approvals"],
    impactHe: "ביצועי קמפיינים ב-Facebook/Instagram, קהלים ותגובות למודעות",
    impactEn: "Facebook/Instagram campaign performance, audiences and ad responses",
    missingImpactHe: "ניתוח קהלים ופרסום ב-Meta אינם זמינים.",
    missingImpactEn: "Audience analysis and Meta advertising unavailable.",
  },
  {
    id: "tiktok-ads", name: "TikTok Ads", shortName: "TikTok", icon: "🎵", color: "#00c2b4",
    fields: ["accessToken", "advertiserId"],
    affectsHe: ["קהלים", "Creative Lab"],
    affectsEn: ["Audiences", "Creative Lab"],
    impactHe: "נתוני קמפיינים ב-TikTok, ביצועי וידאו ומעורבות",
    impactEn: "TikTok campaign data, video performance and engagement",
    missingImpactHe: "פרסום ב-TikTok לא זמין.",
    missingImpactEn: "TikTok advertising unavailable.",
  },
  {
    id: "woocommerce", name: "WooCommerce", shortName: "WooComm", icon: "🛍️", color: "#7f54b3",
    fields: ["storeUrl", "consumerKey", "consumerSecret"],
    affectsHe: ["מוצרים", "SEO & GEO", "Creative Lab", "רווחיות"],
    affectsEn: ["Products", "SEO & GEO", "Creative Lab", "Profitability"],
    impactHe: "קטלוג מוצרים, הזמנות, הכנסות ונתוני מלאי",
    impactEn: "Product catalog, orders, revenue and inventory data",
    missingImpactHe: "מוצרים, הכנסות ו-SEO אינם מסונכרנים מהחנות.",
    missingImpactEn: "Products, revenue and SEO are not synced from the store.",
  },
  {
    id: "shopify", name: "Shopify", shortName: "Shopify", icon: "🟢", color: "#96bf48",
    fields: ["shopDomain", "accessToken"],
    affectsHe: ["מוצרים", "Creative Lab", "רווחיות"],
    affectsEn: ["Products", "Creative Lab", "Profitability"],
    impactHe: "קטלוג מוצרים, הזמנות והכנסות מ-Shopify",
    impactEn: "Product catalog, orders and revenue from Shopify",
    missingImpactHe: "נתוני Shopify לא מסונכרנים.",
    missingImpactEn: "Shopify data not synced.",
  },
  {
    id: "ga4", name: "Google Analytics 4", shortName: "GA4", icon: "📈", color: "#e37400",
    fields: ["measurementId", "propertyId"],
    affectsHe: ["סקירה כללית", "רווחיות", "SEO & GEO"],
    affectsEn: ["Overview", "Profitability", "SEO & GEO"],
    impactHe: "מבקרים, יחס המרה, אירועים ונתיבי משתמשים",
    impactEn: "Visitors, conversion rate, events and user journeys",
    missingImpactHe: "נתוני Analytics לא זמינים — לא ניתן למדוד תנועה.",
    missingImpactEn: "Analytics data unavailable — can't measure traffic.",
  },
  {
    id: "gsc", name: "Google Search Console", shortName: "GSC", icon: "🔍", color: "#34a853",
    fields: ["siteUrl"],
    affectsHe: ["SEO & GEO", "ניתוח חיפושים"],
    affectsEn: ["SEO & GEO", "Search Intelligence"],
    impactHe: "דירוגים, קליקים, חשיפות ומילות מפתח בגוגל",
    impactEn: "Rankings, clicks, impressions and Google keywords",
    missingImpactHe: "ניתוח SEO ו-GEO מוגבל — אין נתוני חיפוש אמיתיים.",
    missingImpactEn: "SEO & GEO analysis limited — no real search data.",
  },
  {
    id: "openai", name: "OpenAI", shortName: "OpenAI", icon: "⚡", color: "#10a37f",
    fields: ["apiKey"],
    affectsHe: ["Creative Lab", "המלצות AI", "SEO & GEO"],
    affectsEn: ["Creative Lab", "AI Recommendations", "SEO & GEO"],
    impactHe: "יצירת קריאייטיב, כתיבת מודעות ותמונות עם GPT-4o ו-DALL·E 3",
    impactEn: "Creative generation, ad copywriting and images with GPT-4o & DALL·E 3",
    missingImpactHe: "AI לתוכן ותמונות לא זמין.",
    missingImpactEn: "AI content and image generation unavailable.",
  },
  {
    id: "anthropic", name: "Anthropic / Claude", shortName: "Claude", icon: "🧠", color: "#b87333",
    fields: ["apiKey"],
    affectsHe: ["המלצות AI", "Creative Lab", "SEO & GEO"],
    affectsEn: ["AI Recommendations", "Creative Lab", "SEO & GEO"],
    impactHe: "ניתוח אסטרטגי, קופירייטינג ו-AI SEO עם Claude",
    impactEn: "Strategic analysis, copywriting and AI SEO with Claude",
    missingImpactHe: "ניתוח AI מעמיק ואסטרטגיה לא זמינים.",
    missingImpactEn: "Deep AI analysis and strategy unavailable.",
  },
];

function getConnectionQuality(platform: ConnPlatform, conn: Connection | undefined): number {
  if (!conn?.connected) return 0;
  if (conn.fields?.oauth === "connected") return 100;
  const filled = platform.fields.filter(f => conn.fields?.[f]?.trim());
  return platform.fields.length === 0 ? 100 : Math.round((filled.length / platform.fields.length) * 100);
}

function qualityColor(pct: number): string {
  if (pct === 0) return "#94a3b8";
  if (pct < 70) return "#f59e0b";
  if (pct < 100) return "#3b82f6";
  return "#10b981";
}

/* ── Connection Detail Popup ────────────────────────────────────── */
function ConnectionDetailPopup({
  platform, quality, conn, lang, onClose, onGoToConnections,
}: {
  platform: ConnPlatform; quality: number; conn: Connection | undefined;
  lang: Lang; onClose: () => void; onGoToConnections: () => void;
}) {
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;
  const color = qualityColor(quality);
  const r = 22; const circ = 2 * Math.PI * r;
  const dash = circ * (quality / 100);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 130 }}
      onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: 340, boxShadow: C.shadowLg, position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, insetInlineEnd: 12, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textMuted }}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: platform.color + "15", border: `1px solid ${platform.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{platform.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>{platform.name}</div>
            <div style={{ fontSize: 12, color: quality > 0 ? color : C.textMuted, fontWeight: 600, marginTop: 2 }}>
              {quality === 0 ? t("לא מחובר", "Not Connected") : quality === 100 ? t("מחובר ✓", "Connected ✓") : t(`חלקי — ${quality}%`, `Partial — ${quality}%`)}
            </div>
          </div>
          {/* Quality ring */}
          <svg width="56" height="56" style={{ marginInlineStart: "auto", transform: isHe ? "scaleX(-1)" : "none" }}>
            <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth="4" />
            <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              strokeDashoffset="0" transform="rotate(-90 28 28)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
            <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{quality}%</text>
          </svg>
        </div>

        {/* Impact description */}
        <div style={{ background: C.cardAlt, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{t("מה חיבור זה מספק", "What this connection provides")}</div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>{isHe ? platform.impactHe : platform.impactEn}</div>
        </div>

        {/* Affected modules */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t("משפיע על", "Affects modules")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(isHe ? platform.affectsHe : platform.affectsEn).map(mod => (
              <span key={mod} style={{ background: C.accentLight, color: C.accent, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{mod}</span>
            ))}
          </div>
        </div>

        {/* Fields status */}
        {quality < 100 && quality > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t("שדות נדרשים", "Required fields")}</div>
            {platform.fields.map(f => {
              const filled = !!conn?.fields?.[f]?.trim();
              return (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: filled ? C.green : C.textMuted, marginBottom: 4 }}>
                  <span>{filled ? "✓" : "○"}</span> <span style={{ fontFamily: "monospace" }}>{f}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Missing impact warning */}
        {quality < 100 && (
          <div style={{ background: quality === 0 ? C.redLight : C.amberLight, border: `1px solid ${quality === 0 ? C.red : C.amber}30`, borderRadius: 10, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: quality === 0 ? C.redText : C.amberText, lineHeight: 1.5 }}>
            ⚠️ {isHe ? platform.missingImpactHe : platform.missingImpactEn}
          </div>
        )}

        <button onClick={onGoToConnections} style={{ width: "100%", background: platform.color, border: "none", borderRadius: 10, padding: "11px 0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {quality === 0 ? t("חבר עכשיו", "Connect Now") : t("ערוך חיבור", "Edit Connection")}
        </button>
      </div>
    </div>
  );
}

/* ── Connection Status Bar ──────────────────────────────────────── */
function ConnectionStatusBar({ lang, connections, onGoToConnections }: {
  lang: Lang;
  connections: Record<string, Connection>;
  onGoToConnections: () => void;
}) {
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;
  const [popup, setPopup] = useState<ConnPlatform | null>(null);

  const connectedCount = CONN_PLATFORMS.filter(p => connections[p.id]?.connected).length;
  const avgQuality = Math.round(
    CONN_PLATFORMS.reduce((acc, p) => acc + getConnectionQuality(p, connections[p.id]), 0) / CONN_PLATFORMS.length
  );

  return (
    <>
      <div style={{ background: C.cardAlt, borderBottom: `1px solid ${C.border}`, padding: "6px 20px", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        {/* Summary */}
        <div className="as-desktop-only" style={{ alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>
            {t("חיבורים", "Connections")}:
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: qualityColor(avgQuality) }}>
            {connectedCount}/{CONN_PLATFORMS.length}
          </span>
          <div style={{ width: 48, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(connectedCount / CONN_PLATFORMS.length) * 100}%`, height: "100%", background: qualityColor(avgQuality), borderRadius: 3, transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Platform bubbles */}
        <div className="as-conn-bar" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
          {CONN_PLATFORMS.map(platform => {
            const quality = getConnectionQuality(platform, connections[platform.id]);
            const color = qualityColor(quality);
            const isConn = quality > 0;
            return (
              <button
                key={platform.id}
                onClick={() => setPopup(popup?.id === platform.id ? null : platform)}
                title={`${platform.name}: ${quality}%`}
                style={{
                  display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  padding: "4px 10px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${popup?.id === platform.id ? color : isConn ? color + "50" : C.border}`,
                  background: popup?.id === platform.id ? color + "15" : isConn ? color + "08" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13 }}>{platform.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: isConn ? color : C.textMuted, whiteSpace: "nowrap" }} className="as-desktop-only">
                  {platform.shortName}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#fff",
                  background: color, borderRadius: 10, padding: "1px 5px", minWidth: 24, textAlign: "center",
                  display: quality === 0 ? "none" : "inline-block",
                }}>{quality}%</span>
                {quality === 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.border, display: "inline-block" }} />}
              </button>
            );
          })}
        </div>

        {/* Go to connections */}
        <button onClick={onGoToConnections} style={{ flexShrink: 0, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: C.textSub, whiteSpace: "nowrap" }} className="as-desktop-only">
          {t("נהל חיבורים", "Manage")} 🔗
        </button>
      </div>

      {/* Popup */}
      {popup && (
        <ConnectionDetailPopup
          platform={popup}
          quality={getConnectionQuality(popup, connections[popup.id])}
          conn={connections[popup.id]}
          lang={lang}
          onClose={() => setPopup(null)}
          onGoToConnections={() => { onGoToConnections(); setPopup(null); }}
        />
      )}
    </>
  );
}

/* ── Sidebar component ─────────────────────────────────────────── */
function Sidebar({ lang, active, onSelect, onLangChange, onLogout, onToggleDark, isDark, user }: {
  lang: Lang;
  active: TabId;
  onSelect: (id: TabId) => void;
  onLangChange: (l: Lang) => void;
  onLogout: () => void;
  onToggleDark: () => void;
  isDark: boolean;
  user: { name: string; email: string; avatar?: string; role: string } | null;
}) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const groups = NAV_GROUPS[lang];

  const navItem = (item: typeof NAV_ITEMS[number]) => {
    const isActive = active === item.id;
    const badge = BADGES[item.id];
    return (
      <button key={item.id} onClick={() => onSelect(item.id)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
        background: isActive ? C.sidebarActive : "transparent",
        color: isActive ? C.sidebarActiveText : C.sidebarText,
        fontSize: 13, fontWeight: isActive ? 600 : 400,
        textAlign: "start", transition: "background 0.12s, color 0.12s",
        marginBottom: 2,
      }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lang === "he" ? item.he : item.en}
        </span>
        {badge && (
          <span style={{ background: badge.color, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", flexShrink: 0 }}>
            {badge.count}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside style={{ width: 240, background: C.sidebar, borderInlineEnd: `1px solid ${C.sidebarBorder}`, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>AdScale AI</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>AI Growth OS</div>
        </div>
        {/* Dark mode toggle */}
        <button onClick={onToggleDark} title={t(isDark ? "מצב בהיר" : "מצב כהה", isDark ? "Light mode" : "Dark mode")}
          style={{ marginInlineStart: "auto", background: isDark ? "rgba(129,140,248,0.15)" : C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {groups.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group.id);
          return (
            <div key={group.id} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 10px 6px" }}>{group.label}</div>
              {items.map(navItem)}
            </div>
          );
        })}
      </nav>

      {/* User info + logout */}
      {user && (
        <div style={{ padding: "12px 10px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px", background: C.cardAlt, borderRadius: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{user.avatar || "👤"}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 12, color: C.textSub, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            🚪 {t("יציאה", "Logout")}
          </button>
        </div>
      )}

      {/* Lang toggle */}
      <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, padding: "0 2px" }}>
          {(["he", "en"] as const).map(l => (
            <button key={l} onClick={() => onLangChange(l)} style={{
              flex: 1, padding: "7px 6px", borderRadius: 8,
              border: `1px solid ${lang === l ? C.accent : C.border}`,
              background: lang === l ? C.accentLight : "transparent",
              color: lang === l ? C.accent : C.textMuted,
              fontSize: 12, fontWeight: lang === l ? 700 : 400, cursor: "pointer", transition: "all 0.15s",
            }}>{l === "he" ? "🇮🇱 עברית" : "🇺🇸 English"}</button>
          ))}
        </div>
      </div>

      {/* Creator credits */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, flexShrink: 0, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>
          פותח ע״י <span style={{ fontWeight: 600, color: C.textSub }}>אשר בוקשפן</span>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted }}>052-5640054</div>
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
  const [currentUser] = useState(() => getUser());
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("adscale_theme") === "dark"
  );
  const router = useRouter();

  // Apply dark/light theme to document
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "";
    localStorage.setItem("adscale_theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Load connections on mount + refresh when switching to integrations tab
  useEffect(() => {
    setConnections(getConnections());
  }, [activeTab]);

  function handleLogout() {
    clearUser();
    router.replace("/login");
  }

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

  function goToConnections() {
    setActiveTab("integrations");
    setDrawerOpen(false);
  }

  const BOTTOM_TABS: TabId[] = ["overview", "recommendations", "seo", "products", "integrations"];

  const sidebarProps = {
    lang, active: activeTab, onSelect: handleSelect, onLangChange: setLang,
    onLogout: handleLogout, onToggleDark: () => setIsDark(d => !d), isDark, user: currentUser,
  };

  // Stats metric border colors (using fixed rgba since status colors don't change between themes)
  const metrics = [
    { label: t("הוצאה", "Spend"),      val: `₪${Math.round(summary.totalSpent).toLocaleString()}`,    color: "var(--c-accent)", borderColor: "rgba(99,102,241,0.2)",   icon: "💸", bg: C.accentLight },
    { label: t("הכנסה", "Revenue"),     val: `₪${Math.round(summary.totalRevenue).toLocaleString()}`,  color: "var(--c-green)",  borderColor: "rgba(16,185,129,0.2)",   icon: "💰", bg: C.greenLight  },
    { label: "ROAS",                    val: `${summary.avgRoas.toFixed(2)}x`,                          color: "var(--c-amber)",  borderColor: "rgba(245,158,11,0.2)",   icon: "🎯", bg: C.amberLight  },
    { label: t("המרות", "Conversions"), val: Math.round(summary.totalConversions).toLocaleString(),     color: "var(--c-blue)",   borderColor: "rgba(59,130,246,0.2)",   icon: "📊", bg: C.blueLight   },
  ];

  return (
    <div className="as-app" style={{ direction: dir }}>

      {/* ── Desktop Sidebar ───────────────────────────────────────── */}
      <div className="as-sidebar-wrapper">
        <Sidebar {...sidebarProps} />
      </div>

      {/* ── Mobile drawer overlay ─────────────────────────────────── */}
      <div className={`as-sidebar-overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`as-sidebar-drawer ${dir === "rtl" ? "rtl" : ""} ${drawerOpen ? "open" : ""}`}>
        <Sidebar {...sidebarProps} />
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="as-main">

        {/* ── Top header bar ──────────────────────────────────────── */}
        <header style={{
          background: C.card, borderBottom: `1px solid ${C.border}`,
          padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12,
          position: "sticky", top: 0, zIndex: 50, boxShadow: C.shadow, flexShrink: 0,
        }}>
          {/* Mobile hamburger */}
          <button className="as-mobile-only" onClick={() => setDrawerOpen(true)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 18, color: C.textSub }}>☰</button>

          {/* Mobile logo */}
          <div className="as-mobile-only" style={{ flex: 1, fontSize: 16, fontWeight: 700, color: C.text }}>⚡ AdScale</div>

          {/* Desktop: breadcrumb */}
          <div className="as-desktop-only" style={{ flex: 1, alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>AdScale</span>
            <span style={{ fontSize: 13, color: C.textMuted, margin: "0 4px" }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{activeItem.icon} {lang === "he" ? activeItem.he : activeItem.en}</span>
          </div>

          {/* Date presets */}
          <div className="as-desktop-only" style={{ background: C.pageBg, borderRadius: 8, padding: 3, gap: 2, border: `1px solid ${C.border}` }}>
            {DATE_PRESETS.map((p, i) => (
              <button key={i} onClick={() => setPreset(i)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, background: preset === i ? C.accent : "transparent",
                color: preset === i ? "#fff" : C.textSub, transition: "all 0.15s",
              }}>{lang === "he" ? p.he : p.en}</button>
            ))}
          </div>

          {/* Mobile dark toggle */}
          <button className="as-mobile-only" onClick={() => setIsDark(d => !d)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>
            {isDark ? "☀️" : "🌙"}
          </button>

          {/* Refresh */}
          <button onClick={refetch} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, cursor: "pointer", fontSize: 16 }} title={t("רענן", "Refresh")}>↻</button>

          {/* Live indicator */}
          <div className="as-desktop-only" style={{
            alignItems: "center", gap: 6, fontSize: 12,
            color: isLive ? C.green : C.textMuted,
            background: isLive ? C.greenLight : C.pageBg,
            padding: "4px 10px", borderRadius: 20,
            border: `1px solid ${isLive ? C.greenA : C.border}`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? C.green : C.textMuted, display: "inline-block" }} />
            {isLive ? t("חי", "Live") : t("דמו", "Demo")}
          </div>
        </header>

        {/* ── Connection Status Bar ─────────────────────────────── */}
        <ConnectionStatusBar lang={lang} connections={connections} onGoToConnections={goToConnections} />

        {/* ── Stats bar ─────────────────────────────────────────── */}
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", flexShrink: 0 }}>
          <div className="as-stats-grid">
            {metrics.map((m, i) => (
              <div key={i} style={{ background: m.bg, border: `1px solid ${m.borderColor}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
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

        {/* ── Module content ────────────────────────────────────── */}
        <div className="as-content" style={{ flex: 1, background: C.pageBg }}>
          {activeTab === "overview"          && <OverviewModule lang={lang} />}
          {activeTab === "recommendations"   && <RecommendationsModule lang={lang} />}
          {activeTab === "search-terms"      && <SearchTermsModule lang={lang} />}
          {activeTab === "negative-keywords" && <NegativeKeywordsModule lang={lang} />}
          {activeTab === "profitability"     && <ProfitabilityModule lang={lang} />}
          {activeTab === "budget"            && <BudgetModule lang={lang} />}
          {activeTab === "creative-lab"      && <CreativeLabModule lang={lang} />}
          {activeTab === "seo"               && <SEOModule lang={lang} />}
          {activeTab === "products"          && <ProductsModule lang={lang} />}
          {activeTab === "audiences"         && <AudiencesModule lang={lang} />}
          {activeTab === "approvals"         && <ApprovalsModule lang={lang} />}
          {activeTab === "audit-log"         && <AuditLogModule lang={lang} />}
          {activeTab === "automation"        && <AutomationModule lang={lang} />}
          {activeTab === "integrations"      && <IntegrationsModule lang={lang} />}
          {activeTab === "users"             && <UsersModule lang={lang} />}
        </div>

        {/* ── Mobile bottom nav ────────────────────────────────── */}
        <nav className="as-mobile-bottom-nav">
          {BOTTOM_TABS.map(id => {
            const item = NAV_ITEMS.find(i => i.id === id)!;
            const isActive = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
                color: isActive ? C.accent : C.textMuted, fontSize: 10, fontWeight: isActive ? 700 : 400,
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{lang === "he" ? item.he.split(" ")[0] : item.en.split(" ")[0]}</span>
              </button>
            );
          })}
          <button onClick={() => setDrawerOpen(true)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
            color: C.textMuted, fontSize: 10,
          }}>
            <span style={{ fontSize: 20 }}>☰</span>
            <span>{t("עוד", "More")}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
