"use client";
import { useState } from "react";
import { C } from "../theme";
import type { Lang } from "../page";

/* ── Types ──────────────────────────────────────────────────────── */
interface SEOIssue {
  id: string;
  type: "missing_title" | "missing_meta" | "thin_content" | "missing_alt" | "duplicate_meta" | "weak_slug" | "no_schema";
  severity: "critical" | "high" | "medium" | "low";
  url: string;
  title: string;
  titleEn: string;
  detail: string;
  detailEn: string;
  suggestion: string;
  suggestionEn: string;
  status: "open" | "applied" | "dismissed";
}

interface KeywordOpportunity {
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  opportunity: "page2" | "low_ctr" | "featured" | "new";
  page: string;
  suggestedAction: string;
  suggestedActionEn: string;
}

interface GEOPage {
  url: string;
  title: string;
  geoScore: number;
  hasStructuredData: boolean;
  hasFAQ: boolean;
  hasSummary: boolean;
  answerReadiness: number;
  semanticClarity: number;
}

/* ── Mock data ──────────────────────────────────────────────────── */
const SEO_ISSUES: SEOIssue[] = [
  { id: "1", type: "missing_title", severity: "critical", url: "/product/running-shoes-x1", title: "חסרה כותרת SEO", titleEn: "Missing SEO Title", detail: "המוצר 'נעלי ריצה X1' אין לו כותרת SEO מותאמת. Google משתמש בשם המוצר הגולמי.", detailEn: "Product 'Running Shoes X1' has no SEO title. Google is using the raw product name.", suggestion: "נעלי ריצה X1 | ביצועים מקצועיים | משלוח חינם", suggestionEn: "Running Shoes X1 | Pro Performance | Free Shipping", status: "open" },
  { id: "2", type: "missing_meta", severity: "critical", url: "/product/running-shoes-x2", title: "חסר תיאור מטא", titleEn: "Missing Meta Description", detail: "8 מוצרים חסרים תיאור מטא — שיעור הקלקה נמוך ב-34%.", detailEn: "8 products missing meta description — CTR 34% lower than average.", suggestion: "נעלי ריצה X2 עם תמיכת קשת מתקדמת. ₪299. משלוח חינם עד הבית. 30 יום להחזרה.", suggestionEn: "X2 running shoes with advanced arch support. ₪299. Free delivery. 30-day returns.", status: "open" },
  { id: "3", type: "thin_content", severity: "high", url: "/product/sport-socks", title: "תוכן דל", titleEn: "Thin Content", detail: "עמוד המוצר 'גרביים ספורטיביות' מכיל 87 מילים בלבד. Google מדרג עמודים עם תוכן מלא יותר.", detailEn: "Product page 'Sport Socks' contains only 87 words. Google favors richer content pages.", suggestion: "הוסף תיאור מפורט, יתרונות, שאלות ותשובות ומידע טכני למוצר.", suggestionEn: "Add detailed description, benefits, FAQs and technical specs to the product.", status: "open" },
  { id: "4", type: "missing_alt", severity: "high", url: "/product/running-shoes-x1", title: "חסר טקסט חלופי לתמונות", titleEn: "Missing Image Alt Text", detail: "12 תמונות מוצרים ללא alt text — Google ו-accessibility נפגעים.", detailEn: "12 product images missing alt text — hurts Google ranking and accessibility.", suggestion: "נעלי ריצה X1 — צד ימין", suggestionEn: "Running Shoes X1 — right side view", status: "open" },
  { id: "5", type: "duplicate_meta", severity: "high", url: "/category/shoes", title: "מטא כפול", titleEn: "Duplicate Meta Description", detail: "3 עמודי קטגוריות משתמשים באותו תיאור מטא — בלבול עבור Google.", detailEn: "3 category pages share the same meta description — confuses Google.", suggestion: "צור תיאור ייחודי לכל קטגוריה עם מילות מפתח ספציפיות.", suggestionEn: "Create unique description for each category with specific keywords.", status: "open" },
  { id: "6", type: "weak_slug", severity: "medium", url: "/product/p-1234", title: "slug חלש", titleEn: "Weak URL Slug", detail: "כתובת URL לא תיאורית — Google מעדיף URL עם מילות מפתח.", detailEn: "Non-descriptive URL slug — Google prefers keyword-rich URLs.", suggestion: "/product/naali-ritza-x1-miktzoiot", suggestionEn: "/product/running-shoes-x1-professional", status: "open" },
  { id: "7", type: "no_schema", severity: "medium", url: "/product/running-shoes-x1", title: "חסר Schema markup", titleEn: "Missing Schema Markup", detail: "עמוד המוצר חסר Product schema — לא יופיע כ-rich snippet בGoogle.", detailEn: "Product page lacks Product schema — won't show as rich snippet in Google.", suggestion: "הוסף Product schema עם מחיר, דירוג, זמינות.", suggestionEn: "Add Product schema with price, rating, availability.", status: "open" },
  { id: "8", type: "missing_title", severity: "low", url: "/category/accessories", title: "כותרת SEO חלשה", titleEn: "Weak SEO Title", detail: "הכותרת הנוכחית קצרה מדי (15 תווים). האורך האידיאלי: 50-60 תווים.", detailEn: "Current title too short (15 chars). Ideal length: 50-60 chars.", suggestion: "אביזרי ריצה ופיטנס | קולקציית 2025 | חינם משלוח", suggestionEn: "Running & Fitness Accessories | 2025 Collection | Free Shipping", status: "open" },
];

const KEYWORD_OPPORTUNITIES: KeywordOpportunity[] = [
  { keyword: "נעלי ריצה מקצועיות", position: 11, impressions: 8400, clicks: 142, ctr: 1.69, opportunity: "page2", page: "/category/running-shoes", suggestedAction: "שפר כותרת H1 והוסף תוכן עשיר לעמוד הקטגוריה", suggestedActionEn: "Improve H1 title and add rich content to category page" },
  { keyword: "נעלי ריצה נייקי מחיר", position: 7, impressions: 5200, clicks: 88, ctr: 1.69, opportunity: "low_ctr", page: "/product/running-shoes-x1", suggestedAction: "שנה meta description לכלול מחיר ומבצע", suggestedActionEn: "Update meta description to include price and offer" },
  { keyword: "נעלי ספורט לילדים", position: 4, impressions: 3100, clicks: 48, ctr: 1.55, opportunity: "low_ctr", page: "/category/kids-shoes", suggestedAction: "שפר תיאור מטא עם קריאה לפעולה", suggestedActionEn: "Improve meta description with strong CTA" },
  { keyword: "גרביים לריצה", position: 14, impressions: 2800, clicks: 23, ctr: 0.82, opportunity: "page2", page: "/product/sport-socks", suggestedAction: "הוסף תוכן עשיר ומילות מפתח לעמוד", suggestedActionEn: "Add rich content and target keywords to page" },
  { keyword: "כיצד לבחור נעלי ריצה", position: 18, impressions: 4200, clicks: 19, ctr: 0.45, opportunity: "featured", page: "/blog/how-to-choose", suggestedAction: "הוסף תשובה תמציתית בראש העמוד לזכייה בFeatured Snippet", suggestedActionEn: "Add concise answer at top of page to win Featured Snippet" },
  { keyword: "נעלי ריצה אדידס ישראל", position: 22, impressions: 3600, clicks: 12, ctr: 0.33, opportunity: "page2", page: "/brand/adidas", suggestedAction: "צור עמוד נחיתה ייעודי עם תוכן עמוק", suggestedActionEn: "Create dedicated landing page with deep content" },
];

const GEO_PAGES: GEOPage[] = [
  { url: "/product/running-shoes-x1", title: "נעלי ריצה X1", geoScore: 72, hasStructuredData: true, hasFAQ: false, hasSummary: false, answerReadiness: 65, semanticClarity: 80 },
  { url: "/category/running-shoes",   title: "נעלי ריצה",    geoScore: 45, hasStructuredData: false, hasFAQ: false, hasSummary: false, answerReadiness: 30, semanticClarity: 55 },
  { url: "/product/sport-socks",      title: "גרביים ספורטיביות", geoScore: 28, hasStructuredData: false, hasFAQ: false, hasSummary: false, answerReadiness: 20, semanticClarity: 35 },
  { url: "/blog/how-to-choose",       title: "מדריך בחירת נעלי ריצה", geoScore: 88, hasStructuredData: true, hasFAQ: true, hasSummary: true, answerReadiness: 92, semanticClarity: 85 },
  { url: "/category/accessories",     title: "אביזרים",      geoScore: 31, hasStructuredData: false, hasFAQ: false, hasSummary: false, answerReadiness: 22, semanticClarity: 40 },
];

/* ── Helper components ──────────────────────────────────────────── */
const SEVERITY_COLORS: Record<string, string> = {
  critical: C.red, high: C.orange, medium: C.amber, low: C.blue,
};
const SEVERITY_BG: Record<string, string> = {
  critical: C.redLight, high: C.orangeLight, medium: C.amberLight, low: C.blueLight,
};
const SEVERITY_HE: Record<string, string> = {
  critical: "קריטי", high: "גבוה", medium: "בינוני", low: "נמוך",
};
const SEVERITY_EN: Record<string, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};
const ISSUE_TYPE_ICONS: Record<string, string> = {
  missing_title: "🏷️", missing_meta: "📝", thin_content: "📄",
  missing_alt: "🖼️", duplicate_meta: "🔄", weak_slug: "🔗", no_schema: "📋",
};

function ScoreRing({ score, size = 80, color }: { score: number; size?: number; color: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={16} fontWeight={700} fill={color}>{score}</text>
    </svg>
  );
}

function SectionHeader({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
      {action && actionLabel && (
        <button onClick={action} style={{
          padding: "6px 16px", borderRadius: 8, border: "none",
          background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
        }}>{actionLabel}</button>
      )}
    </div>
  );
}

/* ── Main module ────────────────────────────────────────────────── */
export default function SEOModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [activeSection, setActiveSection] = useState("score");
  const [issues, setIssues] = useState<SEOIssue[]>(SEO_ISSUES);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [applying, setApplying] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [bulkApplied, setBulkApplied] = useState(0);

  const openIssues = issues.filter(i => i.status === "open");
  const filteredIssues = severityFilter === "all" ? openIssues : openIssues.filter(i => i.severity === severityFilter);

  const applyIssue = async (id: string) => {
    setApplying(id);
    await new Promise(r => setTimeout(r, 1200));
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: "applied" } : i));
    setApplying(null);
  };

  const dismissIssue = (id: string) =>
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: "dismissed" } : i));

  const runAnalysis = async () => {
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2000));
    setAnalyzing(false);
  };

  const bulkApplyAll = async () => {
    const count = filteredIssues.length;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 1500));
    setIssues(prev => prev.map(i => i.status === "open" ? { ...i, status: "applied" } : i));
    setBulkApplied(count);
    setAnalyzing(false);
  };

  const overallSEO = Math.round(
    (issues.filter(i => i.status === "applied").length / issues.length) * 100 * 0.4 +
    68 * 0.6
  );

  const SECTIONS = [
    { id: "score",    icon: "🎯", he: "ציון SEO",          en: "SEO Score" },
    { id: "issues",   icon: "🚨", he: `בעיות (${openIssues.length})`, en: `Issues (${openIssues.length})` },
    { id: "keywords", icon: "🔍", he: "מילות מפתח",        en: "Keywords" },
    { id: "geo",      icon: "🤖", he: "GEO / AI",           en: "GEO / AI" },
    { id: "bulk",     icon: "⚡", he: "פעולות מרוכזות",    en: "Bulk Actions" },
  ];

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div className="as-card" style={{ padding: 24, marginBottom: 20, ...extra }}>
      {children}
    </div>
  );

  /* ── Score tab ────────────────────────────────────────────────── */
  const ScoreTab = () => (
    <div>
      {card(
        <div>
          <SectionHeader title={t("ציון בריאות SEO", "SEO Health Score")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { label: t("SEO כולל", "Overall SEO"),       score: overallSEO, color: overallSEO > 70 ? C.green : C.amber },
              { label: t("GEO / AI", "GEO / AI Ready"),     score: 61,        color: C.purple },
              { label: t("תוכן",    "Content Quality"),     score: 74,        color: C.blue },
              { label: t("טכני",    "Technical Health"),    score: 82,        color: C.teal },
            ].map(m => (
              <div key={m.label} style={{
                background: C.pageBg, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: 20,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              }}>
                <ScoreRing score={m.score} color={m.color} />
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: "center" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {card(
        <div>
          <SectionHeader title={t("סיכום בעיות לפי חומרה", "Issue Summary by Severity")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {(["critical", "high", "medium", "low"] as const).map(sev => {
              const count = openIssues.filter(i => i.severity === sev).length;
              return (
                <button
                  key={sev}
                  onClick={() => { setSeverityFilter(sev); setActiveSection("issues"); }}
                  style={{
                    background: SEVERITY_BG[sev],
                    border: `1px solid ${SEVERITY_COLORS[sev]}33`,
                    borderRadius: 10, padding: "16px 12px",
                    cursor: "pointer", textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 26, fontWeight: 800, color: SEVERITY_COLORS[sev] }}>{count}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                    {lang === "he" ? SEVERITY_HE[sev] : SEVERITY_EN[sev]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {card(
        <div>
          <SectionHeader title={t("פעולות מהירות", "Quick Actions")} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { he: "🔍 נתח חנות מחדש",      en: "🔍 Re-analyze Store",        action: runAnalysis,   color: C.accent },
              { he: "📝 צור כל תיאורי מטא",  en: "📝 Generate All Meta Descs", action: () => setActiveSection("bulk"), color: C.purple },
              { he: "🖼️ תקן alt text בכמות", en: "🖼️ Fix Alt Text in Bulk",   action: () => setActiveSection("bulk"), color: C.teal },
              { he: "🔗 ניתוח לינקים פנימיים",en: "🔗 Internal Link Analysis",  action: () => {},      color: C.blue },
            ].map(btn => (
              <button
                key={btn.en}
                onClick={btn.action}
                disabled={analyzing}
                style={{
                  padding: "9px 18px", borderRadius: 8, border: `1px solid ${btn.color}33`,
                  background: `${btn.color}11`, color: btn.color, cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                }}
              >{lang === "he" ? btn.he : btn.en}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ── Issues tab ───────────────────────────────────────────────── */
  const IssuesTab = () => (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "critical", "high", "medium", "low"].map(f => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              style={{
                padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: severityFilter === f
                  ? (f === "all" ? C.accent : SEVERITY_COLORS[f])
                  : C.pageBg,
                color: severityFilter === f ? "#fff" : C.textSub,
                border: `1px solid ${severityFilter === f ? "transparent" : C.border}`,
              }}
            >
              {f === "all" ? t("הכל", "All") : (lang === "he" ? SEVERITY_HE[f] : SEVERITY_EN[f])}
              {f !== "all" && ` (${openIssues.filter(i => i.severity === f).length})`}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={bulkApplyAll}
            disabled={analyzing || filteredIssues.length === 0}
            style={{
              padding: "7px 18px", borderRadius: 8, border: "none",
              background: analyzing ? C.border : C.accent, color: "#fff",
              cursor: analyzing ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            {analyzing ? t("⚡ מיישם...", "⚡ Applying...") : `⚡ ${t("יישם הכל", "Apply All")}`}
          </button>
        </div>
      </div>

      {/* Issue cards */}
      {filteredIssues.length === 0 ? (
        <div className="as-card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.green }}>
            {t("אין בעיות פתוחות בסינון הנוכחי", "No open issues matching current filter")}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredIssues.map(issue => (
            <div key={issue.id} className="as-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{ISSUE_TYPE_ICONS[issue.type]}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                        {lang === "he" ? issue.title : issue.titleEn}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px",
                        background: SEVERITY_BG[issue.severity], color: SEVERITY_COLORS[issue.severity],
                      }}>
                        {lang === "he" ? SEVERITY_HE[issue.severity] : SEVERITY_EN[issue.severity]}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontFamily: "monospace" }}>
                      🔗 {issue.url}
                    </div>
                    <div style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>
                      {lang === "he" ? issue.detail : issue.detailEn}
                    </div>
                    <div style={{
                      background: C.accentLight, border: `1px solid ${C.accent}22`,
                      borderRadius: 8, padding: "8px 12px", fontSize: 13,
                    }}>
                      <span style={{ color: C.textMuted, fontWeight: 600 }}>{t("💡 הצעת AI: ", "💡 AI Suggestion: ")}</span>
                      <span style={{ color: C.accentHover, fontWeight: 500 }}>
                        {lang === "he" ? issue.suggestion : issue.suggestionEn}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => applyIssue(issue.id)}
                    disabled={applying === issue.id}
                    style={{
                      padding: "7px 16px", borderRadius: 8, border: "none",
                      background: applying === issue.id ? C.border : C.green,
                      color: applying === issue.id ? C.textMuted : "#fff",
                      cursor: applying === issue.id ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                    }}
                  >
                    {applying === issue.id ? t("⏳ מיישם...", "⏳ Applying...") : t("✅ יישם", "✅ Apply")}
                  </button>
                  <button
                    onClick={() => dismissIssue(issue.id)}
                    style={{
                      padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: C.card, color: C.textMuted, cursor: "pointer", fontSize: 12,
                    }}
                  >✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {bulkApplied > 0 && (
        <div style={{
          marginTop: 16, padding: "12px 20px", background: C.greenLight,
          border: `1px solid ${C.green}33`, borderRadius: 10, fontSize: 13, color: C.greenText,
        }}>
          ✅ {t(`יושמו ${bulkApplied} שיפורי SEO בהצלחה`, `Successfully applied ${bulkApplied} SEO improvements`)}
        </div>
      )}
    </div>
  );

  /* ── Keywords tab ─────────────────────────────────────────────── */
  const KeywordsTab = () => {
    const OPP_HE: Record<string, string> = { page2: "עמוד 2", low_ctr: "CTR נמוך", featured: "Featured Snippet", new: "הזדמנות חדשה" };
    const OPP_EN: Record<string, string> = { page2: "Page 2", low_ctr: "Low CTR", featured: "Featured Snippet", new: "New Opportunity" };
    const OPP_COLORS: Record<string, string> = { page2: C.orange, low_ctr: C.amber, featured: C.purple, new: C.green };

    return (
      <div>
        {card(
          <div>
            <SectionHeader title={t("הזדמנויות מילות מפתח", "Keyword Opportunities")} />
            <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textSub }}>
              {t("מבוסס על נתוני Google Search Console — מילות מפתח עם פוטנציאל צמיחה גבוה", "Based on Google Search Console data — high-growth keyword opportunities")}
            </p>
            <div className="as-table-container">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.pageBg }}>
                    {[
                      t("מילת מפתח", "Keyword"), t("עמוד", "Position"), t("חשיפות", "Impressions"),
                      t("קליקים", "Clicks"), "CTR", t("הזדמנות", "Opportunity"), t("פעולה", "Action"),
                    ].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "start", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KEYWORD_OPPORTUNITIES.map((kw, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 12px", fontWeight: 600, color: C.text }}>{kw.keyword}</td>
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                          background: kw.position <= 10 ? C.greenLight : kw.position <= 20 ? C.amberLight : C.redLight,
                          color: kw.position <= 10 ? C.greenText : kw.position <= 20 ? C.amberText : C.redText,
                        }}>{kw.position}</span>
                      </td>
                      <td style={{ padding: "12px 12px", color: C.textSub }}>{kw.impressions.toLocaleString()}</td>
                      <td style={{ padding: "12px 12px", color: C.textSub }}>{kw.clicks}</td>
                      <td style={{ padding: "12px 12px", color: kw.ctr < 2 ? C.red : C.green }}>{kw.ctr.toFixed(2)}%</td>
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                          background: `${OPP_COLORS[kw.opportunity]}22`, color: OPP_COLORS[kw.opportunity],
                        }}>{lang === "he" ? OPP_HE[kw.opportunity] : OPP_EN[kw.opportunity]}</span>
                      </td>
                      <td style={{ padding: "12px 12px", color: C.textSub, fontSize: 12, maxWidth: 200 }}>
                        {lang === "he" ? kw.suggestedAction : kw.suggestedActionEn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── GEO / AI tab ─────────────────────────────────────────────── */
  const GEOTab = () => (
    <div>
      {card(
        <div>
          <SectionHeader
            title={t("GEO — אופטימיזציה למנועי AI", "GEO — AI Search Engine Optimization")}
          />
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
            {t(
              "GEO (Generative Engine Optimization) מכין את התוכן שלך לגוגל SGE, ChatGPT, Perplexity ומנועי AI אחרים. עמודים עם ציון GEO גבוה מופיעים בתשובות AI.",
              "GEO (Generative Engine Optimization) prepares your content for Google SGE, ChatGPT, Perplexity and other AI engines. High GEO score pages appear in AI answers."
            )}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GEO_PAGES.map((page, i) => (
              <div key={i} style={{
                background: C.pageBg, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{page.title}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{page.url}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ScoreRing score={page.geoScore} size={56} color={page.geoScore >= 70 ? C.green : page.geoScore >= 40 ? C.amber : C.red} />
                    <span style={{ fontSize: 11, color: C.textMuted }}>GEO</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {[
                    { label: "Schema", ok: page.hasStructuredData },
                    { label: "FAQ",    ok: page.hasFAQ },
                    { label: t("תמצית", "Summary"), ok: page.hasSummary },
                  ].map(badge => (
                    <span key={badge.label} style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                      background: badge.ok ? C.greenLight : C.redLight,
                      color: badge.ok ? C.greenText : C.redText,
                    }}>{badge.ok ? "✅" : "❌"} {badge.label}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: t("מוכנות לתשובה", "Answer Readiness"), value: page.answerReadiness },
                    { label: t("בהירות סמנטית", "Semantic Clarity"), value: page.semanticClarity },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.textSub }}>{m.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{m.value}%</span>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 4, width: `${m.value}%`,
                          background: m.value >= 70 ? C.green : m.value >= 40 ? C.amber : C.red,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
                {page.geoScore < 70 && (
                  <div style={{
                    marginTop: 12, background: C.purpleLight, border: `1px solid ${C.purple}33`,
                    borderRadius: 8, padding: "10px 14px", fontSize: 13,
                  }}>
                    <span style={{ color: C.purple, fontWeight: 700 }}>🤖 {t("הצעת AI: ", "AI Suggestion: ")}</span>
                    <span style={{ color: C.textSub }}>
                      {page.hasFAQ ? "" : t("הוסף בלוק שאלות ותשובות. ", "Add FAQ section. ")}
                      {page.hasSummary ? "" : t("הוסף תמצית קצרה בראש הדף. ", "Add brief summary at top of page. ")}
                      {page.hasStructuredData ? "" : t("הוסף Schema markup מתאים.", "Add appropriate Schema markup.")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ── Bulk tab ─────────────────────────────────────────────────── */
  const BulkTab = () => {
    const [bulkStep, setBulkStep] = useState(0); // 0=idle, 1=analyzing, 2=review
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    const startAnalysis = async () => {
      setBulkStep(1);
      await new Promise(r => setTimeout(r, 2500));
      setBulkStep(2);
    };

    const BULK_ITEMS = [
      { id: "b1", product: t("נעלי ריצה X1", "Running Shoes X1"), field: "SEO Title", current: "נעלי ריצה", suggested: "נעלי ריצה X1 | מקצועיות | משלוח חינם" },
      { id: "b2", product: t("נעלי ריצה X2", "Running Shoes X2"), field: "Meta Description", current: "", suggested: t("נעלי ריצה X2 — תמיכת קשת מתקדמת. ₪299. משלוח חינם.", "Running Shoes X2 — advanced arch support. ₪299. Free delivery.") },
      { id: "b3", product: t("גרביים ספורטיביות", "Sport Socks"), field: "SEO Title", current: "גרביים", suggested: "גרביים לריצה | נוחות מקסימלית | 3 זוגות ₪89" },
      { id: "b4", product: t("אביזרי ריצה", "Running Accessories"), field: "Meta Description", current: "", suggested: t("אביזרי ריצה ופיטנס איכותיים. משלוח מהיר, מחירים משתלמים.", "Quality running and fitness accessories. Fast shipping, great prices.") },
      { id: "b5", product: t("קולקציית 2025", "2025 Collection"), field: "Alt Text (×8)", current: "", suggested: t("נעלי ריצה מקצועיות — קולקציית 2025", "Professional running shoes — 2025 collection") },
    ];

    return (
      <div>
        {card(
          <div>
            <SectionHeader title={t("אופטימיזציית SEO מרוכזת", "Bulk SEO Optimizer")} />
            <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
              {t(
                "נתח את כל מוצרי WooCommerce, צור שיפורים AI לכל הכותרות, תיאורים ו-alt text — ויישם הכל בלחיצה אחת.",
                "Analyze all WooCommerce products, generate AI improvements for all titles, descriptions and alt text — apply everything in one click."
              )}
            </p>

            {bulkStep === 0 && (
              <button
                onClick={startAnalysis}
                style={{
                  padding: "12px 28px", borderRadius: 10, border: "none",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
                  boxShadow: C.shadowMd,
                }}
              >🔍 {t("נתח חנות מלאה", "Analyze Full Store")}</button>
            )}

            {bulkStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, color: C.textSub, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `3px solid ${C.accent}`,
                    borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  {t("מנתח 47 מוצרים...", "Analyzing 47 products...")}
                </div>
                {["SEO Titles", "Meta Descriptions", "Alt Text", "Content Quality", "Schema"].map((step, i) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: C.textSub }}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {bulkStep === 2 && (
              <div>
                <div style={{
                  background: C.greenLight, border: `1px solid ${C.green}33`,
                  borderRadius: 8, padding: "10px 16px", fontSize: 13, color: C.greenText,
                  marginBottom: 16, fontWeight: 600,
                }}>
                  ✅ {t(`נמצאו ${BULK_ITEMS.length} שיפורים עבור 47 מוצרים`, `Found ${BULK_ITEMS.length} improvements across 47 products`)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                  <button
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      BULK_ITEMS.forEach(i => { all[i.id] = true; });
                      setSelected(all);
                    }}
                    style={{ fontSize: 13, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >{t("בחר הכל", "Select All")}</button>
                  <button
                    disabled={Object.values(selected).filter(Boolean).length === 0}
                    style={{
                      padding: "8px 20px", borderRadius: 8, border: "none",
                      background: C.green, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    }}
                  >⚡ {t(`יישם ${Object.values(selected).filter(Boolean).length} שינויים`, `Apply ${Object.values(selected).filter(Boolean).length} Changes`)}</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {BULK_ITEMS.map(item => (
                    <div key={item.id} style={{
                      background: C.pageBg, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: 14,
                      display: "flex", gap: 12, alignItems: "flex-start",
                    }}>
                      <input
                        type="checkbox"
                        checked={!!selected[item.id]}
                        onChange={e => setSelected(prev => ({ ...prev, [item.id]: e.target.checked }))}
                        style={{ marginTop: 2, accentColor: C.accent }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.product}</span>
                          <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>{item.field}</span>
                        </div>
                        {item.current && (
                          <div style={{ fontSize: 12, color: C.red, textDecoration: "line-through", marginBottom: 4 }}>
                            {t("קיים: ", "Current: ")}{item.current}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                          {t("חדש: ", "New: ")}{item.suggested}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div>
      {/* Section tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: 4,
        overflowX: "auto",
      }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: activeSection === s.id ? 700 : 500,
              background: activeSection === s.id ? C.accent : "transparent",
              color: activeSection === s.id ? "#fff" : C.textSub,
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >{s.icon} {lang === "he" ? s.he : s.en}</button>
        ))}
      </div>

      {activeSection === "score"    && <ScoreTab />}
      {activeSection === "issues"   && <IssuesTab />}
      {activeSection === "keywords" && <KeywordsTab />}
      {activeSection === "geo"      && <GEOTab />}
      {activeSection === "bulk"     && <BulkTab />}
    </div>
  );
}
