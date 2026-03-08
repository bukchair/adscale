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
import FinancialReportsModule from "./financial-reports/FinancialReportsModule";
import { getUser, clearUser, getConnections, loadConnectionsFromServer, isSuperAdmin, type Connection, ROLES, MODULE_PERMISSIONS } from "../lib/auth";
import { getViewingAsTenantId, getTenantById, clearViewingAs } from "../lib/tenant";
import type { Lang } from "../lib/i18n";
import { LANG_META, tl, NAV_GROUP_LABELS, MODULE_NAMES, MODULE_INFO, UI } from "../lib/i18n";

export type { Lang };

function sanitizeDisplayName(name: string | undefined, email: string): string {
  if (!name || name.startsWith("http://") || name.startsWith("https://") || name.startsWith("//") || /^[\w.-]+\.[a-z]{2,}\//.test(name)) {
    const base = email.split("@")[0].replace(/[._]/g, " ");
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return name;
}

/* ── Navigation items ──────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "overview",          icon: "📊", group: "performance" },
  { id: "profitability",     icon: "💰", group: "performance" },
  { id: "budget",            icon: "📈", group: "performance" },
  { id: "financial-reports", icon: "💹", group: "performance" },
  { id: "recommendations",   icon: "🤖", group: "campaigns"   },
  { id: "search-terms",      icon: "🔍", group: "campaigns"   },
  { id: "negative-keywords", icon: "🚫", group: "campaigns"   },
  { id: "seo",               icon: "🎯", group: "growth"      },
  { id: "products",          icon: "🛍️", group: "growth"      },
  { id: "audiences",         icon: "👥", group: "growth"      },
  { id: "creative-lab",      icon: "✍️", group: "growth"      },
  { id: "approvals",         icon: "✅", group: "manage"      },
  { id: "automation",        icon: "⚙️", group: "manage"      },
  { id: "audit-log",         icon: "📋", group: "manage"      },
  { id: "integrations",      icon: "🔗", group: "manage"      },
  { id: "users",             icon: "👤", group: "manage"      },
] as const;

type TabId = typeof NAV_ITEMS[number]["id"];

const NAV_GROUPS = ["performance", "campaigns", "growth", "manage"] as const;

const DATE_PRESETS = [
  { he: "7 ימים",  en: "7d",  es: "7d",   de: "7T",  fr: "7j",  pt: "7d",  days: 7  },
  { he: "14 ימים", en: "14d", es: "14d",  de: "14T", fr: "14j", pt: "14d", days: 14 },
  { he: "30 ימים", en: "30d", es: "30d",  de: "30T", fr: "30j", pt: "30d", days: 30 },
];

const BADGES: Partial<Record<TabId, { count: number; color: string }>> = {
  approvals:           { count: 5,  color: "#f59e0b" },
  seo:                 { count: 12, color: "#ef4444"  },
  "negative-keywords": { count: 8,  color: "#f97316" },
  audiences:           { count: 1,  color: "#3b82f6"  },
  "financial-reports": { count: 3,  color: "#10b981"  },
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
  creatorOnly?: boolean; // Gemini is set at creator level
}

const CONN_PLATFORMS: ConnPlatform[] = [
  {
    id: "google-ads", name: "Google Ads", shortName: "Google", icon: "🔵", color: "#4285f4",
    fields: ["customer_id", "dev_token"],
    affectsHe: ["המלצות AI", "ניהול תקציב", "ניתוח חיפושים", "מילות שליליות", "רווחיות"],
    affectsEn: ["AI Recommendations", "Budget Control", "Search Intelligence", "Negative Keywords", "Profitability"],
    impactHe: "נתוני קמפיינים חיים, הוצאות, ROAS, המרות ומילות מפתח",
    impactEn: "Live campaign data, spend, ROAS, conversions and keywords",
    missingImpactHe: "כל נתוני Google Ads מוצגים כדמו. לא ניתן לנהל קמפיינים.",
    missingImpactEn: "All Google Ads data is shown as demo. Campaign management unavailable.",
  },
  {
    id: "meta-ads", name: "Meta Ads", shortName: "Meta", icon: "🔷", color: "#1877f2",
    fields: ["access_token", "account_id"],
    affectsHe: ["קהלים", "Creative Lab", "אישורים"],
    affectsEn: ["Audiences", "Creative Lab", "Approvals"],
    impactHe: "ביצועי קמפיינים ב-Facebook/Instagram, קהלים ותגובות למודעות",
    impactEn: "Facebook/Instagram campaign performance, audiences and ad responses",
    missingImpactHe: "ניתוח קהלים ופרסום ב-Meta אינם זמינים.",
    missingImpactEn: "Audience analysis and Meta advertising unavailable.",
  },
  {
    id: "tiktok-ads", name: "TikTok Ads", shortName: "TikTok", icon: "🎵", color: "#00c2b4",
    fields: ["access_token", "advertiser_id"],
    affectsHe: ["קהלים", "Creative Lab"],
    affectsEn: ["Audiences", "Creative Lab"],
    impactHe: "נתוני קמפיינים ב-TikTok, ביצועי וידאו ומעורבות",
    impactEn: "TikTok campaign data, video performance and engagement",
    missingImpactHe: "פרסום ב-TikTok לא זמין.",
    missingImpactEn: "TikTok advertising unavailable.",
  },
  {
    id: "woocommerce", name: "WooCommerce", shortName: "WooComm", icon: "🛍️", color: "#7f54b3",
    fields: ["store_url", "consumer_key", "consumer_secret"],
    affectsHe: ["מוצרים", "SEO & GEO", "Creative Lab", "רווחיות"],
    affectsEn: ["Products", "SEO & GEO", "Creative Lab", "Profitability"],
    impactHe: "קטלוג מוצרים, הזמנות, הכנסות ונתוני מלאי",
    impactEn: "Product catalog, orders, revenue and inventory data",
    missingImpactHe: "מוצרים, הכנסות ו-SEO אינם מסונכרנים מהחנות.",
    missingImpactEn: "Products, revenue and SEO are not synced from the store.",
  },
  {
    id: "ga4", name: "Google Analytics 4", shortName: "GA4", icon: "📈", color: "#e37400",
    fields: ["measurement_id", "property_id"],
    affectsHe: ["סקירה כללית", "רווחיות", "SEO & GEO"],
    affectsEn: ["Overview", "Profitability", "SEO & GEO"],
    impactHe: "מבקרים, יחס המרה, אירועים ונתיבי משתמשים",
    impactEn: "Visitors, conversion rate, events and user journeys",
    missingImpactHe: "נתוני Analytics לא זמינים — לא ניתן למדוד תנועה.",
    missingImpactEn: "Analytics data unavailable — can't measure traffic.",
  },
  {
    id: "gsc", name: "Google Search Console", shortName: "GSC", icon: "🔍", color: "#34a853",
    fields: ["site_url"],
    affectsHe: ["SEO & GEO", "ניתוח חיפושים"],
    affectsEn: ["SEO & GEO", "Search Intelligence"],
    impactHe: "דירוגים, קליקים, חשיפות ומילות מפתח בגוגל",
    impactEn: "Rankings, clicks, impressions and Google keywords",
    missingImpactHe: "ניתוח SEO ו-GEO מוגבל — אין נתוני חיפוש אמיתיים.",
    missingImpactEn: "SEO & GEO analysis limited — no real search data.",
  },
  {
    id: "gmail", name: "Gmail", shortName: "Gmail", icon: "✉️", color: "#ea4335",
    fields: ["client_id", "client_secret", "sender_email"],
    affectsHe: ["דוחות כספיים", "משתמשים", "אוטומציה"],
    affectsEn: ["Financial Reports", "Users", "Automation"],
    impactHe: "שליחת דוחות אוטומטיים, עדכונים והזמנות משתמשים באימייל",
    impactEn: "Send automated reports, updates and user invitations by email",
    missingImpactHe: "שליחת דוחות ועדכונים באימייל לא זמינה.",
    missingImpactEn: "Email reports and updates unavailable.",
  },
  {
    id: "gemini", name: "Google Gemini AI", shortName: "Gemini", icon: "✨", color: "#9333ea",
    fields: ["api_key"],
    affectsHe: ["Creative Lab", "המלצות AI", "SEO & GEO", "ניתוח חיפושים"],
    affectsEn: ["Creative Lab", "AI Recommendations", "SEO & GEO", "Search Intelligence"],
    impactHe: "יצירת קריאייטיב, כתיבת מודעות, ניתוח SEO ותמונות מוצר עם Gemini",
    impactEn: "Creative generation, ad copywriting, SEO analysis and product images with Gemini",
    missingImpactHe: "AI לתוכן, תמונות וניתוח אסטרטגי לא זמין.",
    missingImpactEn: "AI content, images and strategic analysis unavailable.",
    creatorOnly: false,
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
    <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "clamp(60px, 10vh, 130px)", paddingLeft: 12, paddingRight: 12 }}
      onClick={onClose}>
      <div className="as-popup-mobile" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: 340, maxWidth: "calc(100vw - 24px)", boxShadow: C.shadowLg, position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, insetInlineEnd: 12, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textMuted }}>✕</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: platform.color + "15", border: `1px solid ${platform.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{platform.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>{platform.name}</div>
            <div style={{ fontSize: 12, color: quality > 0 ? color : C.textMuted, fontWeight: 600, marginTop: 2 }}>
              {quality === 0 ? tl(lang, UI.notConnected!) : quality === 100 ? tl(lang, UI.connected!) : `${tl(lang, {he:"חלקי",en:"Partial",es:"Parcial",de:"Teilweise",fr:"Partiel",pt:"Parcial"})} — ${quality}%`}
            </div>
          </div>
          <svg width="56" height="56" style={{ marginInlineStart: "auto", transform: isHe ? "scaleX(-1)" : "none" }}>
            <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth="4" />
            <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              strokeDashoffset="0" transform="rotate(-90 28 28)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
            <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{quality}%</text>
          </svg>
        </div>
        <div style={{ background: C.cardAlt, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{tl(lang, UI.whatProvides!)}</div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>{isHe ? platform.impactHe : platform.impactEn}</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{tl(lang, UI.affects!)}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(isHe ? platform.affectsHe : platform.affectsEn).map(mod => (
              <span key={mod} style={{ background: C.accentLight, color: C.accent, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{mod}</span>
            ))}
          </div>
        </div>
        {quality < 100 && quality > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{tl(lang, UI.requiredFields!)}</div>
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
        {quality < 100 && (
          <div style={{ background: quality === 0 ? C.redLight : C.amberLight, border: `1px solid ${quality === 0 ? C.red : C.amber}30`, borderRadius: 10, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: quality === 0 ? C.redText : C.amberText, lineHeight: 1.5 }}>
            ⚠️ {isHe ? platform.missingImpactHe : platform.missingImpactEn}
          </div>
        )}
        <button onClick={onGoToConnections} style={{ width: "100%", background: platform.color, border: "none", borderRadius: 10, padding: "11px 0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {quality === 0 ? tl(lang, UI.connectNow!) : tl(lang, UI.editConn!)}
        </button>
      </div>
    </div>
  );
}

/* ── Compact Connection Quality Bubble (replaces full bar) ──────── */
function QualityBubble({ lang, connections, onGoToConnections }: {
  lang: Lang;
  connections: Record<string, Connection>;
  onGoToConnections: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [detailPlatform, setDetailPlatform] = useState<ConnPlatform | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const connectedCount = CONN_PLATFORMS.filter(p => connections[p.id]?.connected).length;
  const totalCount = CONN_PLATFORMS.length;
  const avgQuality = Math.round(
    CONN_PLATFORMS.reduce((acc, p) => acc + getConnectionQuality(p, connections[p.id]), 0) / totalCount
  );
  const color = qualityColor(avgQuality);

  const issues = CONN_PLATFORMS.filter(p => getConnectionQuality(p, connections[p.id]) < 100);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Bubble trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 11px", borderRadius: 20, cursor: "pointer",
          border: `1px solid ${open ? color : color + "50"}`,
          background: open ? color + "12" : color + "08",
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 14 }}>🔗</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }} className="as-desktop-only">
          {connectedCount}/{totalCount}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#fff",
          background: color, borderRadius: 10, padding: "1px 6px",
        }}>{avgQuality}%</span>
        <span style={{ fontSize: 10, color: C.textMuted }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", insetInlineEnd: 0,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          boxShadow: C.shadowLg, width: 320, maxWidth: "calc(100vw - 24px)", zIndex: 200,
          padding: 16,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{tl(lang, UI.connQuality!)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Overall ring */}
              <svg width="40" height="40">
                <circle cx="20" cy="20" r="16" fill="none" stroke={C.border} strokeWidth="3.5" />
                <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 16 * avgQuality / 100} ${2 * Math.PI * 16}`}
                  strokeLinecap="round" transform="rotate(-90 20 20)" />
                <text x="20" y="25" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{avgQuality}%</text>
              </svg>
            </div>
          </div>

          {/* Platform list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {CONN_PLATFORMS.map(p => {
              const q = getConnectionQuality(p, connections[p.id]);
              const c = qualityColor(q);
              return (
                <button key={p.id} onClick={() => { setDetailPlatform(p); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: q > 0 ? c + "08" : "transparent", border: `1px solid ${q > 0 ? c + "30" : C.border}`, cursor: "pointer", width: "100%", textAlign: "start" }}>
                  <span style={{ fontSize: 14 }}>{p.icon}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: q > 0 ? C.text : C.textMuted }}>{p.name}</span>
                  {q > 0 ? (
                    <span style={{ fontSize: 10, fontWeight: 700, background: c, color: "#fff", borderRadius: 8, padding: "2px 7px" }}>{q}%</span>
                  ) : (
                    <span style={{ fontSize: 10, color: C.textMuted }}>—</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Issues checklist */}
          <div style={{ background: C.cardAlt, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{tl(lang, UI.issues!)}</div>
            {issues.length === 0 ? (
              <div style={{ fontSize: 12, color: C.green }}>{tl(lang, UI.noIssues!)}</div>
            ) : (
              issues.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textSub, marginBottom: 4 }}>
                  <span style={{ color: "#f59e0b", flexShrink: 0 }}>⚠</span>
                  <span>{lang === "he" ? p.missingImpactHe.split(".")[0] : p.missingImpactEn.split(".")[0]}</span>
                </div>
              ))
            )}
          </div>

          <button onClick={() => { onGoToConnections(); setOpen(false); }}
            style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {tl(lang, UI.manageConns!)} 🔗
          </button>
        </div>
      )}

      {/* Detail popup */}
      {detailPlatform && (
        <ConnectionDetailPopup
          platform={detailPlatform}
          quality={getConnectionQuality(detailPlatform, connections[detailPlatform.id])}
          conn={connections[detailPlatform.id]}
          lang={lang}
          onClose={() => setDetailPlatform(null)}
          onGoToConnections={() => { onGoToConnections(); setDetailPlatform(null); }}
        />
      )}
    </div>
  );
}

/* ── Module Info Modal ──────────────────────────────────────────── */
function ModuleInfoModal({ tabId, lang, onClose }: { tabId: TabId; lang: Lang; onClose: () => void }) {
  const item = NAV_ITEMS.find(i => i.id === tabId);
  if (!item) return null;
  const name = tl(lang, MODULE_NAMES[tabId] ?? { he: tabId, en: tabId, es: tabId, de: tabId, fr: tabId, pt: tabId });
  const info = tl(lang, MODULE_INFO[tabId] ?? { he: "", en: "", es: "", de: "", fr: "", pt: "" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", boxShadow: C.shadowLg, position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, insetInlineEnd: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textMuted }}>✕</button>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{item.icon}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 12 }}>{name}</div>
        <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, marginBottom: 20 }}>{info}</div>
        <button onClick={onClose} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {tl(lang, UI.understood!)}
        </button>
      </div>
    </div>
  );
}

/* ── Permissions Modal ──────────────────────────────────────────── */
function PermissionsModal({ lang, user, onClose }: {
  lang: Lang;
  user: { name: string; email: string; role: string; platformRole?: string };
  onClose: () => void;
}) {
  const roleInfo = ROLES[user.role as keyof typeof ROLES];
  const allowedModules = MODULE_PERMISSIONS[user.role as keyof typeof MODULE_PERMISSIONS] ?? [];
  const allModuleIds = NAV_ITEMS.map(i => i.id);
  const accessible = allowedModules[0] === "*" ? allModuleIds : allowedModules;
  const restricted = allModuleIds.filter(id => !accessible.includes(id));
  const isCreator = user.platformRole === "super_admin";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.card, borderRadius: 20, padding: 32, maxWidth: 460, width: "100%", boxShadow: C.shadowLg }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{isCreator ? "👑" : "👤"}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>
            {tl(lang, UI.welcomeTitle!)}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{user.email}</div>
        </div>

        {/* Role badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ background: isCreator ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : roleInfo?.bg ?? C.accentLight, color: isCreator ? "#fff" : roleInfo?.color ?? C.accent, borderRadius: 20, padding: "6px 20px", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            {isCreator ? "👑 " + (lang === "he" ? "יוצר המערכת" : "System Creator") : (lang === "he" ? roleInfo?.he : roleInfo?.en) ?? user.role}
          </div>
        </div>

        <div style={{ fontSize: 13, color: C.textSub, textAlign: "center", marginBottom: 20 }}>
          {tl(lang, UI.permissionsInfo!)}
        </div>

        {/* Accessible modules */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            ✓ {tl(lang, UI.canAccess!)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {accessible.slice(0, 10).map(id => {
              const item = NAV_ITEMS.find(i => i.id === id);
              return (
                <span key={id} style={{ background: C.greenLight, color: C.greenText ?? C.green, borderRadius: 12, padding: "3px 10px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  {item?.icon} {tl(lang, MODULE_NAMES[id] ?? { he: id, en: id, es: id, de: id, fr: id, pt: id })}
                </span>
              );
            })}
            {accessible.length > 10 && (
              <span style={{ background: C.cardAlt, color: C.textMuted, borderRadius: 12, padding: "3px 10px", fontSize: 11 }}>+{accessible.length - 10}</span>
            )}
          </div>
        </div>

        {/* Restricted modules */}
        {restricted.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              ✗ {tl(lang, UI.noAccess!)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {restricted.map(id => {
                const item = NAV_ITEMS.find(i => i.id === id);
                return (
                  <span key={id} style={{ background: C.redLight, color: C.redText ?? C.red, borderRadius: 12, padding: "3px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, opacity: 0.7 }}>
                    {item?.icon} {tl(lang, MODULE_NAMES[id] ?? { he: id, en: id, es: id, de: id, fr: id, pt: id })}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={onClose} style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 }}>
          {tl(lang, UI.understood!)}
        </button>
      </div>
    </div>
  );
}

/* ── Language Selector Dropdown ─────────────────────────────────── */
function LangDropdown({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = LANG_META[lang];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const LANGS: Lang[] = ["he", "en", "es", "de", "fr", "pt"];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardAlt, cursor: "pointer", fontSize: 12 }}>
        <span>{meta.flag}</span>
        <span style={{ flex: 1, textAlign: "start", color: C.text, fontWeight: 600 }}>{meta.label}</span>
        <span style={{ color: C.textMuted, fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: C.shadowLg, zIndex: 500, overflow: "hidden" }}>
          {LANGS.map(l => {
            const m = LANG_META[l];
            return (
              <button key={l} onClick={() => { onChange(l); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: l === lang ? C.accentLight : "transparent", cursor: "pointer", fontSize: 12, color: l === lang ? C.accent : C.text, fontWeight: l === lang ? 700 : 400 }}>
                <span>{m.flag}</span>
                <span>{m.label}</span>
                {l === lang && <span style={{ marginInlineStart: "auto", fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar component ─────────────────────────────────────────── */
function Sidebar({ lang, active, onSelect, onLangChange, onLogout, onToggleDark, isDark, user, onShowInfo }: {
  lang: Lang;
  active: TabId;
  onSelect: (id: TabId) => void;
  onLangChange: (l: Lang) => void;
  onLogout: () => void;
  onToggleDark: () => void;
  isDark: boolean;
  user: { name: string; email: string; avatar?: string; role: string; platformRole?: string } | null;
  onShowInfo: (id: TabId) => void;
}) {
  const groups = NAV_GROUPS;

  const navItem = (item: typeof NAV_ITEMS[number]) => {
    const isActive = active === item.id;
    const badge = BADGES[item.id];
    const label = tl(lang, MODULE_NAMES[item.id] ?? { he: item.id, en: item.id, es: item.id, de: item.id, fr: item.id, pt: item.id });
    return (
      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
        <button onClick={() => onSelect(item.id)} style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          background: isActive ? C.sidebarActive : "transparent",
          color: isActive ? C.sidebarActiveText : C.sidebarText,
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          textAlign: "start", transition: "background 0.12s, color 0.12s",
        }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
          {badge && (
            <span style={{ background: badge.color, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", flexShrink: 0 }}>
              {badge.count}
            </span>
          )}
        </button>
        {/* Info button */}
        <button onClick={() => onShowInfo(item.id)} title={tl(lang, UI.aboutModule!)}
          style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.textMuted, borderRadius: 6, opacity: 0.6, flexShrink: 0 }}>
          ℹ
        </button>
      </div>
    );
  };

  return (
    <aside style={{ width: 240, background: C.sidebar, borderInlineEnd: `1px solid ${C.sidebarBorder}`, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>BScale AI</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>{tl(lang, UI.aiGrowthOS!)}</div>
        </div>
        <button onClick={onToggleDark} title={isDark ? tl(lang, UI.lightMode ?? {he:"מצב בהיר",en:"Light mode",es:"Modo claro",de:"Hellmodus",fr:"Mode clair",pt:"Modo claro"}) : tl(lang, UI.darkMode ?? {he:"מצב כהה",en:"Dark mode",es:"Modo oscuro",de:"Dunkelmodus",fr:"Mode sombre",pt:"Modo escuro"})}
          style={{ marginInlineStart: "auto", background: isDark ? "rgba(129,140,248,0.15)" : C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {groups.map(groupId => {
          const items = NAV_ITEMS.filter(i => i.group === groupId);
          const groupLabel = tl(lang, NAV_GROUP_LABELS[groupId] ?? { he: groupId, en: groupId, es: groupId, de: groupId, fr: groupId, pt: groupId });
          return (
            <div key={groupId} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 10px 6px" }}>{groupLabel}</div>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sanitizeDisplayName(user.name, user.email)}</div>
              <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 12, color: C.textSub, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            🚪 {tl(lang, UI.logout!)}
          </button>
        </div>
      )}

      {/* Language selector */}
      <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <LangDropdown lang={lang} onChange={onLangChange} />
      </div>

      {/* Super Admin: link to Owner Panel */}
      {user?.platformRole === "super_admin" && (
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <a href="/admin" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))", border: `1px solid ${C.accent}44`, borderRadius: 10, textDecoration: "none" }}>
            <span style={{ fontSize: 16 }}>👑</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{tl(lang, UI.ownerPanel!)}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{tl(lang, UI.ownerPanelSub!)}</div>
            </div>
            <span style={{ fontSize: 12, color: C.textMuted }}>›</span>
          </a>
        </div>
      )}

      {/* Creator credits */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, flexShrink: 0, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>
          {lang === "he" ? "פותח ע״י" : "Built by"} <span style={{ fontWeight: 600, color: C.textSub }}>אשר בוקשפן</span>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted }}>052-5640054</div>
      </div>
    </aside>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "he";
    return (localStorage.getItem("bscale_lang") as Lang) ?? "he";
  });
  const [preset, setPreset] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser] = useState(() => getUser());
  const [connections, setConnections] = useState<Record<string, Connection>>(() => getConnections());
  const [connReady, setConnReady] = useState(false);
  const [viewingAsTenantId] = useState(() => getViewingAsTenantId());
  const viewingAsTenant = viewingAsTenantId ? getTenantById(viewingAsTenantId) : null;
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("bscale_theme") === "dark"
  );
  const [infoTabId, setInfoTabId] = useState<TabId | null>(null);
  const [showPermissions, setShowPermissions] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bscale_perms_seen") !== "1";
  });
  const router = useRouter();

  // Apply dark/light theme
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "";
    localStorage.setItem("bscale_theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Persist language
  useEffect(() => {
    localStorage.setItem("bscale_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = LANG_META[lang].dir;
  }, [lang]);

  // Load connections from server
  useEffect(() => {
    loadConnectionsFromServer()
      .then(() => setConnections(getConnections()))
      .finally(() => setConnReady(true));
  }, []);
  useEffect(() => {
    if (connReady) setConnections(getConnections());
  }, [activeTab, connReady]);

  useEffect(() => {
    const handler = () => setConnections(getConnections());
    window.addEventListener("bscale:connections-changed", handler);
    return () => window.removeEventListener("bscale:connections-changed", handler);
  }, []);

  function handleLogout() {
    clearUser();
    router.replace("/");
  }

  function handleDismissPermissions() {
    localStorage.setItem("bscale_perms_seen", "1");
    setShowPermissions(false);
  }

  const dir = LANG_META[lang].dir;
  const t = (he: string, en: string) => lang === "he" ? he : en;

  const { data, loading, refetch } = useDashboard(
    getDaysAgo(DATE_PRESETS[preset].days),
    getToday()
  );
  const summary = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };
  const isLive = data?.isLive ?? false;

  const activeItem = NAV_ITEMS.find(i => i.id === activeTab)!;
  const activeLabel = tl(lang, MODULE_NAMES[activeTab] ?? { he: activeTab, en: activeTab, es: activeTab, de: activeTab, fr: activeTab, pt: activeTab });

  const handleSelect = (id: TabId) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  function goToConnections() {
    setActiveTab("integrations");
    setDrawerOpen(false);
  }

  const BOTTOM_TABS: TabId[] = ["overview", "financial-reports", "seo", "products", "integrations"];

  const sidebarProps = {
    lang, active: activeTab, onSelect: handleSelect, onLangChange: setLang,
    onLogout: handleLogout, onToggleDark: () => setIsDark(d => !d), isDark,
    user: currentUser, onShowInfo: (id: TabId) => setInfoTabId(id),
  };

  const presetLabel = (p: typeof DATE_PRESETS[0]) => {
    const key = lang as keyof typeof p;
    return (p[key] as string) ?? p.en;
  };

  const metrics = [
    { label: tl(lang, UI.spend!),       val: `₪${Math.round(summary.totalSpent).toLocaleString()}`,    color: "var(--c-accent)", borderColor: "rgba(99,102,241,0.2)",   icon: "💸", bg: C.accentLight },
    { label: tl(lang, UI.revenue!),     val: `₪${Math.round(summary.totalRevenue).toLocaleString()}`,  color: "var(--c-green)",  borderColor: "rgba(16,185,129,0.2)",   icon: "💰", bg: C.greenLight  },
    { label: tl(lang, UI.roas!),        val: `${summary.avgRoas.toFixed(2)}x`,                          color: "var(--c-amber)",  borderColor: "rgba(245,158,11,0.2)",   icon: "🎯", bg: C.amberLight  },
    { label: tl(lang, UI.conversions!), val: Math.round(summary.totalConversions).toLocaleString(),     color: "var(--c-blue)",   borderColor: "rgba(59,130,246,0.2)",   icon: "📊", bg: C.blueLight   },
  ];

  return (
    <div className="as-app" style={{ direction: dir }}>

      {/* ── Permissions Modal (on first login) ────────────────── */}
      {showPermissions && currentUser && (
        <PermissionsModal lang={lang} user={currentUser} onClose={handleDismissPermissions} />
      )}

      {/* ── Module Info Modal ─────────────────────────────────── */}
      {infoTabId && (
        <ModuleInfoModal tabId={infoTabId} lang={lang} onClose={() => setInfoTabId(null)} />
      )}

      {/* ── Desktop Sidebar ───────────────────────────────────── */}
      <div className="as-sidebar-wrapper">
        <Sidebar {...sidebarProps} />
      </div>

      {/* ── Mobile drawer overlay ─────────────────────────────── */}
      <div className={`as-sidebar-overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`as-sidebar-drawer ${dir === "rtl" ? "rtl" : ""} ${drawerOpen ? "open" : ""}`}>
        <Sidebar {...sidebarProps} />
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="as-main">

        {/* ── Top header bar ──────────────────────────────────── */}
        <header className="as-header-bar" style={{
          background: C.card, borderBottom: `1px solid ${C.border}`,
          padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 10,
          position: "sticky", top: 0, zIndex: 50, boxShadow: C.shadow, flexShrink: 0,
        }}>
          {/* Mobile hamburger */}
          <button className="as-mobile-only" onClick={() => setDrawerOpen(true)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 18, color: C.textSub }}>☰</button>

          {/* Mobile logo */}
          <div className="as-mobile-only" style={{ flex: 1, fontSize: 16, fontWeight: 700, color: C.text }}>⚡ BScale</div>

          {/* Desktop: breadcrumb */}
          <div className="as-desktop-only" style={{ flex: 1, alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>BScale</span>
            <span style={{ fontSize: 13, color: C.textMuted, margin: "0 4px" }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{activeItem.icon} {activeLabel}</span>
          </div>

          {/* Date presets (desktop) */}
          <div className="as-desktop-only" style={{ background: C.pageBg, borderRadius: 8, padding: 3, gap: 2, border: `1px solid ${C.border}` }}>
            {DATE_PRESETS.map((p, i) => (
              <button key={i} onClick={() => setPreset(i)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, background: preset === i ? C.accent : "transparent",
                color: preset === i ? "#fff" : C.textSub, transition: "all 0.15s",
              }}>{presetLabel(p)}</button>
            ))}
          </div>

          {/* ── Connection Quality Bubble (replaces old bar) ── */}
          <QualityBubble lang={lang} connections={connections} onGoToConnections={goToConnections} />

          {/* Mobile dark toggle */}
          <button className="as-mobile-only" onClick={() => setIsDark(d => !d)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>
            {isDark ? "☀️" : "🌙"}
          </button>

          {/* Refresh */}
          <button onClick={refetch} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, cursor: "pointer", fontSize: 16 }} title={tl(lang, UI.refresh!)}>↻</button>

          {/* Live indicator */}
          <div className="as-desktop-only" style={{
            alignItems: "center", gap: 6, fontSize: 12,
            color: isLive ? C.green : C.textMuted,
            background: isLive ? C.greenLight : C.pageBg,
            padding: "4px 10px", borderRadius: 20,
            border: `1px solid ${isLive ? C.greenA : C.border}`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? C.green : C.textMuted, display: "inline-block" }} />
            {isLive ? tl(lang, UI.live!) : tl(lang, UI.demo!)}
          </div>
        </header>

        {/* ── Impersonation banner ─────────────────────────────── */}
        {viewingAsTenant && (
          <div style={{ background: "#f59e0b", color: "#000", padding: "8px 20px", display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <span>👁️ {lang === "he" ? `צופה כ: ${viewingAsTenant.name}` : `Viewing as: ${viewingAsTenant.name}`}</span>
            <button onClick={() => { clearViewingAs(); router.push("/admin"); }}
              style={{ marginInlineStart: "auto", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(0,0,0,0.25)", borderRadius: 8, padding: "4px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#000" }}>
              {lang === "he" ? "← חזור לפאנל" : "← Back to Panel"}
            </button>
          </div>
        )}

        {/* ── Stats bar ─────────────────────────────────────────── */}
        <div className="as-stats-bar" style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", flexShrink: 0 }}>
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
          {!connReady ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: C.textMuted, fontSize: 14 }}>
              <div style={{ width: 20, height: 20, border: `2px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              {t("טוען חיבורים...", "Loading connections...")}
            </div>
          ) : (
            <>
              {activeTab === "overview"          && <OverviewModule lang={lang} connections={connections} onGoToConnections={goToConnections} />}
              {activeTab === "financial-reports" && <FinancialReportsModule lang={lang} />}
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
              {activeTab === "integrations"      && <IntegrationsModule lang={lang} onConnectionsChanged={() => setConnections(getConnections())} />}
              {activeTab === "users"             && <UsersModule lang={lang} />}
            </>
          )}
        </div>

        {/* ── Mobile bottom nav ─────────────────────────────────── */}
        <nav className="as-mobile-bottom-nav">
          {BOTTOM_TABS.map(id => {
            const item = NAV_ITEMS.find(i => i.id === id)!;
            const isActive = activeTab === id;
            const label = tl(lang, MODULE_NAMES[id] ?? { he: id, en: id, es: id, de: id, fr: id, pt: id });
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
                color: isActive ? C.accent : C.textMuted, fontSize: 10, fontWeight: isActive ? 700 : 400,
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label.split(" ")[0]}</span>
              </button>
            );
          })}
          <button onClick={() => setDrawerOpen(true)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
            color: C.textMuted, fontSize: 10,
          }}>
            <span style={{ fontSize: 20 }}>☰</span>
            <span>{tl(lang, UI.more!)}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
