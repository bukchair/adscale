"use client";
import { useState, useEffect, useRef } from "react";
import { C } from "../theme";
import { getConnections } from "../../lib/auth";
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
  productId?: number;
  field?: "short_description" | "name" | "alt" | "content" | "slug" | "schema";
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
  productId?: number;
}

/* ── Helper components ──────────────────────────────────────────── */
const SEVERITY_COLORS: Record<string, string> = {
  critical: C.red, high: C.orange, medium: C.amber, low: C.blue,
};
const SEVERITY_BG: Record<string, string> = {
  critical: C.redLight, high: C.orangeLight, medium: C.amberLight, low: C.blueLight,
};
const SEVERITY_HE: Record<string, string> = { critical: "קריטי", high: "גבוה", medium: "בינוני", low: "נמוך" };
const SEVERITY_EN: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={16} fontWeight={700} fill={color}>{score}</text>
    </svg>
  );
}

function SectionHeader({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
      {action && actionLabel && (
        <button onClick={action} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ── Main module ────────────────────────────────────────────────── */
export default function SEOModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [activeSection, setActiveSection] = useState("score");

  // Data state
  const [issues, setIssues]       = useState<SEOIssue[]>([]);
  const [keywords, setKeywords]   = useState<KeywordOpportunity[]>([]);
  const [geoPages, setGeoPages]   = useState<GEOPage[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [geoScore, setGeoScore]   = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [isDemo, setIsDemo]       = useState(false);
  const [kwDemo, setKwDemo]       = useState(false);

  // UI state
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [severityFilter, setSeverityFilter]   = useState("all");
  const [applying, setApplying]   = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [bulkApplied, setBulkApplied] = useState(0);
  const [wooConnected, setWooConnected] = useState(false);
  // AI suggestions per issue id
  const [aiSuggesting, setAiSuggesting] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});

  const openIssues     = issues.filter(i => i.status === "open");
  const filteredIssues = severityFilter === "all" ? openIssues : openIssues.filter(i => i.severity === severityFilter);

  /* ── Connection header builder (pure — no state side-effects) ── */
  function getConnHeaders(): Record<string, string> {
    const conns = getConnections();
    return {
      "x-connections": JSON.stringify({
        woocommerce: conns.woocommerce?.fields ?? {},
        gsc:         conns.gsc?.fields ?? {},
      }),
    };
  }

  /* ── Stable refs so async callbacks never cause re-renders ─── */
  const runningAnalysis  = useRef(false);
  const runningKeywords  = useRef(false);

  async function runAnalysis() {
    if (runningAnalysis.current) return;
    runningAnalysis.current = true;
    setLoadingAnalysis(true);
    setApplyError(null);
    try {
      const res = await fetch("/api/seo/analyze", { headers: getConnHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIssues((data.issues ?? []).map((i: any) => ({ ...i, status: "open" as const })));
      setGeoPages(data.geoPages ?? []);
      setOverallScore(data.overallScore ?? 0);
      setGeoScore(data.geoScore ?? 0);
      setProductCount(data.productCount ?? 0);
      setIsDemo(data.isDemo ?? false);
      // derive wooConnected from returned data
      setWooConnected(!data.isDemo);
    } catch (e: any) {
      setApplyError("Analysis error: " + e.message);
    } finally {
      setLoadingAnalysis(false);
      runningAnalysis.current = false;
    }
  }

  async function loadKeywords() {
    if (runningKeywords.current) return;
    runningKeywords.current = true;
    setLoadingKeywords(true);
    try {
      const res = await fetch("/api/seo/keywords", { headers: getConnHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeywords(data.keywords ?? []);
      setKwDemo(data.isDemo ?? false);
    } catch {
      setKeywords([]);
    } finally {
      setLoadingKeywords(false);
      runningKeywords.current = false;
    }
  }

  // Run once on mount only
  useEffect(() => {
    runAnalysis();
    loadKeywords();
    const handler = () => { runAnalysis(); loadKeywords(); };
    window.addEventListener("bscale:connections-changed", handler);
    return () => window.removeEventListener("bscale:connections-changed", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Apply single issue ───────────────────────────────────── */
  const applyIssue = async (issue: SEOIssue) => {
    if (!issue.productId || !issue.field || ["content", "slug", "schema"].includes(issue.field)) {
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: "applied" } : i));
      return;
    }
    setApplying(issue.id);
    setApplyError(null);
    try {
      const res = await fetch("/api/seo/apply", {
        method: "POST",
        headers: { ...getConnHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ productId: issue.productId, field: issue.field, value: issue.suggestion }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unknown error");
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: "applied" } : i));
    } catch (e: any) {
      setApplyError("Apply error: " + e.message);
    } finally {
      setApplying(null);
    }
  };

  const dismissIssue = (id: string) =>
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: "dismissed" } : i));

  /* ── AI suggest for single issue ─────────────────────────── */
  const suggestWithAI = async (issue: SEOIssue) => {
    if (aiSuggesting === issue.id) return;
    setAiSuggesting(issue.id);
    try {
      const res = await fetch("/api/seo/ai-suggest", {
        method: "POST",
        headers: { ...getConnHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: issue.type,
          productName: lang === "he" ? issue.title : issue.titleEn,
          productDescription: lang === "he" ? issue.detail : issue.detailEn,
          lang,
        }),
      });
      const data = await res.json();
      if (data.suggestion) {
        setAiSuggestions(prev => ({ ...prev, [issue.id]: data.suggestion }));
      }
    } catch {}
    finally { setAiSuggesting(null); }
  };

  /* ── Bulk apply (applies what can be auto-fixed) ──────────── */
  const bulkApplyAll = async () => {
    const toApply = filteredIssues.filter(i => i.productId && i.field && !["content", "slug", "schema"].includes(i.field ?? ""));
    const toMarkOnly = filteredIssues.filter(i => !i.productId || !i.field || ["content", "slug", "schema"].includes(i.field ?? ""));

    setLoadingAnalysis(true);
    setApplyError(null);
    let applied = 0;

    const headers = { ...getConnHeaders(), "Content-Type": "application/json" };
    for (const issue of toApply) {
      try {
        const res = await fetch("/api/seo/apply", {
          method: "POST",
          headers,
          body: JSON.stringify({ productId: issue.productId, field: issue.field, value: issue.suggestion }),
        });
        const data = await res.json();
        if (data.success) {
          setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: "applied" } : i));
          applied++;
        }
      } catch {}
    }

    // Mark manual-only issues as applied in UI
    for (const issue of toMarkOnly) {
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: "applied" } : i));
      applied++;
    }

    setBulkApplied(applied);
    setLoadingAnalysis(false);
  };

  const overallSEO = openIssues.length === 0 ? overallScore : Math.max(10, overallScore - openIssues.length * 3);
  const appliedCount = issues.filter(i => i.status === "applied").length;

  const SECTIONS = [
    { id: "score",    icon: "🎯", he: "ציון SEO",           en: "SEO Score" },
    { id: "issues",   icon: "🚨", he: `בעיות (${openIssues.length})`, en: `Issues (${openIssues.length})` },
    { id: "keywords", icon: "🔍", he: "מילות מפתח",         en: "Keywords" },
    { id: "geo",      icon: "🤖", he: "GEO / AI",            en: "GEO / AI" },
    { id: "bulk",     icon: "⚡", he: "פעולות מרוכזות",     en: "Bulk Actions" },
  ];

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div className="as-card" style={{ padding: 24, marginBottom: 20, ...extra }}>{children}</div>
  );

  /* ── Score tab ────────────────────────────────────────────── */
  const ScoreTab = () => (
    <div>
      {loadingAnalysis && (
        <div style={{ padding: "16px 24px", background: C.accentLight, border: `1px solid ${C.accentA}`, borderRadius: 10, marginBottom: 16, fontSize: 13, color: C.accentHover, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.accent}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          {t("מנתח נתוני SEO...", "Analyzing SEO data...")}
        </div>
      )}
      {card(
        <div>
          <SectionHeader title={t("ציון בריאות SEO", "SEO Health Score")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { label: t("SEO כולל", "Overall SEO"),    score: overallSEO, color: overallSEO > 70 ? C.green : overallSEO > 40 ? C.amber : C.red },
              { label: t("GEO / AI", "GEO / AI Ready"), score: geoScore,   color: geoScore > 70 ? C.green : geoScore > 40 ? C.amber : C.purple },
              { label: t("תיקונים יושמו", "Applied"),   score: issues.length > 0 ? Math.round((appliedCount / issues.length) * 100) : 100, color: C.teal },
              { label: t("מוצרים נותחו", "Products"),   score: Math.min(100, productCount * 10), color: C.blue },
            ].map(m => (
              <div key={m.label} style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ScoreRing score={m.score} color={m.color} />
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: "center" }}>{m.label}</div>
              </div>
            ))}
          </div>
          {productCount > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted }}>
              {isDemo ? `⚠️ ${t("נתוני דמו — חבר WooCommerce לניתוח אמיתי", "Demo data — connect WooCommerce for real analysis")}` : `✅ ${t(`נותחו ${productCount} מוצרים מ-WooCommerce`, `Analyzed ${productCount} products from WooCommerce`)}`}
            </div>
          )}
        </div>
      )}

      {card(
        <div>
          <SectionHeader title={t("סיכום בעיות לפי חומרה", "Issue Summary by Severity")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {(["critical", "high", "medium", "low"] as const).map(sev => {
              const count = openIssues.filter(i => i.severity === sev).length;
              return (
                <button key={sev} onClick={() => { setSeverityFilter(sev); setActiveSection("issues"); }}
                  style={{ background: SEVERITY_BG[sev], border: `1px solid ${SEVERITY_COLORS[sev]}33`, borderRadius: 10, padding: "16px 12px", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: SEVERITY_COLORS[sev] }}>{count}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{lang === "he" ? SEVERITY_HE[sev] : SEVERITY_EN[sev]}</div>
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
              { he: "🔍 נתח חנות מחדש",       en: "🔍 Re-analyze Store",       action: runAnalysis,              color: C.accent },
              { he: "📝 צור כל תיאורי מטא",   en: "📝 Generate All Meta Descs", action: () => setActiveSection("bulk"), color: C.purple },
              { he: "🖼️ תקן alt text בכמות",  en: "🖼️ Fix Alt Text in Bulk",   action: () => setActiveSection("bulk"), color: C.teal },
              { he: "🔍 רענן מילות מפתח",      en: "🔍 Refresh Keywords",        action: loadKeywords,             color: C.blue },
            ].map(btn => (
              <button key={btn.en} onClick={btn.action} disabled={loadingAnalysis}
                style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${btn.color}33`, background: `${btn.color}11`, color: btn.color, cursor: loadingAnalysis ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
                {lang === "he" ? btn.he : btn.en}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ── Issues tab ───────────────────────────────────────────── */
  const IssuesTab = () => (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "critical", "high", "medium", "low"].map(f => (
            <button key={f} onClick={() => setSeverityFilter(f)} style={{
              padding: "5px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: severityFilter === f ? (f === "all" ? C.accent : SEVERITY_COLORS[f]) : C.pageBg,
              color: severityFilter === f ? "#fff" : C.textSub,
              border: `1px solid ${severityFilter === f ? "transparent" : C.border}`,
            }}>
              {f === "all" ? t("הכל", "All") : (lang === "he" ? SEVERITY_HE[f] : SEVERITY_EN[f])}
              {f !== "all" && ` (${openIssues.filter(i => i.severity === f).length})`}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={bulkApplyAll} disabled={loadingAnalysis || filteredIssues.length === 0}
            style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: loadingAnalysis ? C.border : C.accent, color: "#fff", cursor: loadingAnalysis ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {loadingAnalysis ? t("⚡ מיישם...", "⚡ Applying...") : `⚡ ${t("יישם הכל", "Apply All")}`}
          </button>
        </div>
      </div>

      {applyError && (
        <div style={{ marginBottom: 12, padding: "10px 16px", background: C.redLight, border: `1px solid ${C.red}33`, borderRadius: 8, fontSize: 12, color: C.redText }}>
          ❌ {applyError}
        </div>
      )}

      {loadingAnalysis ? (
        <div className="as-card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <div>{t("מנתח...", "Analyzing...")}</div>
        </div>
      ) : filteredIssues.length === 0 ? (
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
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{ISSUE_TYPE_ICONS[issue.type] || "⚠️"}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{lang === "he" ? issue.title : issue.titleEn}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px", background: SEVERITY_BG[issue.severity], color: SEVERITY_COLORS[issue.severity] }}>
                        {lang === "he" ? SEVERITY_HE[issue.severity] : SEVERITY_EN[issue.severity]}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontFamily: "monospace" }}>🔗 {issue.url}</div>
                    <div style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>{lang === "he" ? issue.detail : issue.detailEn}</div>
                    <div style={{ background: C.accentLight, border: `1px solid ${C.accentA}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                      <span style={{ color: C.textMuted, fontWeight: 600 }}>{t("💡 הצעה: ", "💡 Suggestion: ")}</span>
                      <span style={{ color: C.accentHover, fontWeight: 500 }}>{lang === "he" ? issue.suggestion : issue.suggestionEn}</span>
                    </div>
                    {/* AI suggestion */}
                    {aiSuggestions[issue.id] && (
                      <div style={{ marginTop: 8, background: `${C.purple}11`, border: `1px solid ${C.purple}33`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                        <span style={{ color: C.purple, fontWeight: 700 }}>✨ AI: </span>
                        <span style={{ color: C.text, fontWeight: 500 }}>{aiSuggestions[issue.id]}</span>
                        {issue.productId && issue.field && !["content", "slug", "schema"].includes(issue.field) && (
                          <button onClick={() => applyIssue({ ...issue, suggestion: aiSuggestions[issue.id], suggestionEn: aiSuggestions[issue.id] })}
                            style={{ marginInlineStart: 10, padding: "3px 10px", borderRadius: 6, border: "none", background: C.purple, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                            {t("יישם הצעה זו", "Apply this")}
                          </button>
                        )}
                      </div>
                    )}
                    {issue.field === "alt" && (
                      <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
                        ℹ️ {t("alt text יישמר ב-WordPress Media Library", "Alt text will be saved to WordPress Media Library")}
                      </div>
                    )}
                    {["content", "slug"].includes(issue.field ?? "") && (
                      <div style={{ marginTop: 6, fontSize: 11, color: C.amber }}>
                        ✏️ {t("בעיה זו דורשת עריכה ידנית — יסומן כ׳טופל׳", "This issue requires manual editing — will be marked as handled")}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => suggestWithAI(issue)} disabled={aiSuggesting === issue.id}
                      style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.purple}44`, background: `${C.purple}11`, color: C.purple, cursor: aiSuggesting === issue.id ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {aiSuggesting === issue.id ? "⏳" : "✨ AI"}
                    </button>
                    <button onClick={() => applyIssue(issue)} disabled={applying === issue.id}
                      style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: applying === issue.id ? C.border : C.green, color: applying === issue.id ? C.textMuted : "#fff", cursor: applying === issue.id ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {applying === issue.id ? t("⏳ מיישם...", "⏳ Applying...") : t("✅ יישם", "✅ Apply")}
                    </button>
                    <button onClick={() => dismissIssue(issue.id)}
                      style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {bulkApplied > 0 && (
        <div style={{ marginTop: 16, padding: "12px 20px", background: C.greenLight, border: `1px solid ${C.greenA}`, borderRadius: 10, fontSize: 13, color: C.greenText }}>
          ✅ {t(`יושמו ${bulkApplied} שיפורי SEO בהצלחה`, `Successfully applied ${bulkApplied} SEO improvements`)}
        </div>
      )}
    </div>
  );

  /* ── Keywords tab ─────────────────────────────────────────── */
  const KeywordsTab = () => {
    const OPP_HE: Record<string, string> = { page2: "עמוד 2", low_ctr: "CTR נמוך", featured: "Featured Snippet", new: "הזדמנות חדשה" };
    const OPP_EN: Record<string, string> = { page2: "Page 2", low_ctr: "Low CTR", featured: "Featured Snippet", new: "New Opportunity" };
    const OPP_COLORS: Record<string, string> = { page2: C.orange, low_ctr: C.amber, featured: C.purple, new: C.green };
    return (
      <div>
        {card(
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{t("הזדמנויות מילות מפתח", "Keyword Opportunities")}</h3>
              <button onClick={loadKeywords} disabled={loadingKeywords}
                style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, cursor: "pointer", fontSize: 12 }}>
                {loadingKeywords ? "⏳" : "🔄"} {t("רענן", "Refresh")}
              </button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textSub }}>
              {kwDemo
                ? `⚠️ ${t("נתוני דמו — חבר Google Search Console לנתונים אמיתיים", "Demo data — connect Google Search Console for real data")}`
                : t("מבוסס על Google Search Console — מילות מפתח עם פוטנציאל צמיחה גבוה", "Based on Google Search Console — high-growth keyword opportunities")}
            </p>
            {loadingKeywords ? (
              <div style={{ padding: 32, textAlign: "center", color: C.textMuted }}>⏳ {t("טוען...", "Loading...")}</div>
            ) : keywords.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: C.textMuted }}>{t("אין נתונים זמינים", "No data available")}</div>
            ) : (
              <div className="as-table-container">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.pageBg }}>
                      {[t("מילת מפתח", "Keyword"), t("עמדה", "Position"), t("חשיפות", "Impressions"), t("קליקים", "Clicks"), "CTR", t("הזדמנות", "Opportunity"), t("פעולה", "Action")].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "start", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 12px", fontWeight: 600, color: C.text }}>{kw.keyword}</td>
                        <td style={{ padding: "12px 12px" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: kw.position <= 10 ? C.greenLight : kw.position <= 20 ? C.amberLight : C.redLight, color: kw.position <= 10 ? C.greenText : kw.position <= 20 ? C.amberText : C.redText }}>{kw.position}</span>
                        </td>
                        <td style={{ padding: "12px 12px", color: C.textSub }}>{kw.impressions.toLocaleString()}</td>
                        <td style={{ padding: "12px 12px", color: C.textSub }}>{kw.clicks}</td>
                        <td style={{ padding: "12px 12px", color: kw.ctr < 2 ? C.red : C.green }}>{kw.ctr.toFixed(2)}%</td>
                        <td style={{ padding: "12px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${OPP_COLORS[kw.opportunity]}22`, color: OPP_COLORS[kw.opportunity] }}>
                            {lang === "he" ? OPP_HE[kw.opportunity] : OPP_EN[kw.opportunity]}
                          </span>
                        </td>
                        <td style={{ padding: "12px 12px", color: C.textSub, fontSize: 12, maxWidth: 200 }}>
                          {lang === "he" ? kw.suggestedAction : kw.suggestedActionEn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ── GEO / AI tab ─────────────────────────────────────────── */
  const GEOTab = () => (
    <div>
      {card(
        <div>
          <SectionHeader title={t("GEO — אופטימיזציה למנועי AI", "GEO — AI Search Engine Optimization")} />
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
            {t(
              "GEO (Generative Engine Optimization) מכין את התוכן שלך לגוגל SGE, ChatGPT, Perplexity ומנועי AI אחרים.",
              "GEO (Generative Engine Optimization) prepares your content for Google SGE, ChatGPT, Perplexity and other AI engines."
            )}
          </p>
          {loadingAnalysis ? (
            <div style={{ padding: 32, textAlign: "center", color: C.textMuted }}>⏳ {t("מנתח...", "Analyzing...")}</div>
          ) : geoPages.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: C.textMuted }}>{t("אין דפים לניתוח — חבר WooCommerce", "No pages to analyze — connect WooCommerce")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {geoPages.map((page, i) => (
                <div key={i} style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
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
                    {[{ label: "Schema", ok: page.hasStructuredData }, { label: "FAQ", ok: page.hasFAQ }, { label: t("תמצית", "Summary"), ok: page.hasSummary }].map(badge => (
                      <span key={badge.label} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: badge.ok ? C.greenLight : C.redLight, color: badge.ok ? C.greenText : C.redText }}>
                        {badge.ok ? "✅" : "❌"} {badge.label}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[{ label: t("מוכנות לתשובה", "Answer Readiness"), value: page.answerReadiness }, { label: t("בהירות סמנטית", "Semantic Clarity"), value: page.semanticClarity }].map(m => (
                      <div key={m.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: C.textSub }}>{m.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{m.value}%</span>
                        </div>
                        <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, width: `${m.value}%`, background: m.value >= 70 ? C.green : m.value >= 40 ? C.amber : C.red, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {page.geoScore < 70 && (
                    <div style={{ marginTop: 12, background: C.purpleLight, border: `1px solid ${C.purpleA2}`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                      <span style={{ color: C.purple, fontWeight: 700 }}>🤖 {t("הצעת AI: ", "AI Suggestion: ")}</span>
                      <span style={{ color: C.textSub }}>
                        {page.hasFAQ ? "" : t("הוסף בלוק שאלות ותשובות. ", "Add FAQ section. ")}
                        {page.hasSummary ? "" : t("הוסף תמצית קצרה בראש הדף. ", "Add brief summary at top of page. ")}
                        {page.hasStructuredData ? "" : t("הוסף Product Schema markup.", "Add Product Schema markup.")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ── Bulk tab ─────────────────────────────────────────────── */
  const BulkTab = () => {
    const [bulkStep, setBulkStep] = useState(0);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [bulkApplying, setBulkApplying] = useState(false);
    const [bulkDone, setBulkDone] = useState(0);

    const autoFixable = issues.filter(i =>
      i.status === "open" && i.productId &&
      i.field && ["short_description", "name", "alt"].includes(i.field)
    );

    const startAnalysis = async () => {
      setBulkStep(1);
      await runAnalysis();
      setBulkStep(2);
    };

    const applySelected = async () => {
      const selectedIssues = autoFixable.filter(i => selected[i.id]);
      if (!selectedIssues.length) return;
      setBulkApplying(true);
      setBulkDone(0);
      const headers = { ...getConnHeaders(), "Content-Type": "application/json" };
      let done = 0;
      for (const issue of selectedIssues) {
        try {
          const res = await fetch("/api/seo/apply", {
            method: "POST",
            headers,
            body: JSON.stringify({ productId: issue.productId, field: issue.field, value: issue.suggestion }),
          });
          const data = await res.json();
          if (data.success) {
            setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: "applied" } : i));
            done++;
          }
        } catch {}
      }
      setBulkDone(done);
      setBulkApplying(false);
      setSelected({});
    };

    return (
      <div>
        {card(
          <div>
            <SectionHeader title={t("אופטימיזציית SEO מרוכזת", "Bulk SEO Optimizer")} />
            <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
              {t(
                "נתח את כל מוצרי WooCommerce, בחר את השיפורים הרצויים ויישם הכל בלחיצה אחת.",
                "Analyze all WooCommerce products, select desired improvements and apply everything in one click."
              )}
            </p>

            {bulkStep === 0 && (
              <button onClick={startAnalysis} disabled={loadingAnalysis}
                style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: C.shadowMd }}>
                🔍 {t("נתח חנות מלאה", "Analyze Full Store")}
              </button>
            )}

            {bulkStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, color: C.textSub, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `3px solid ${C.accent}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  {t(`מנתח ${productCount || "..."} מוצרים...`, `Analyzing ${productCount || "..."} products...`)}
                </div>
                {["SEO Titles", "Meta Descriptions", "Alt Text", "Content Quality", "GEO Readiness"].map(step => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: C.textSub }}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {bulkStep === 2 && (
              <div>
                <div style={{ background: C.greenLight, border: `1px solid ${C.greenA}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: C.greenText, marginBottom: 16, fontWeight: 600 }}>
                  ✅ {t(`נמצאו ${autoFixable.length} שיפורים הניתנים לאוטומציה`, `Found ${autoFixable.length} automatable improvements`)}
                  {isDemo && ` · ⚠️ ${t("נתוני דמו", "Demo data")}`}
                </div>

                {autoFixable.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: C.green }}>
                    🎉 {t("אין בעיות שניתן לתקן אוטומטית!", "No automatable issues found!")}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                      <button onClick={() => { const all: Record<string, boolean> = {}; autoFixable.forEach(i => { all[i.id] = true; }); setSelected(all); }}
                        style={{ fontSize: 13, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        {t("בחר הכל", "Select All")}
                      </button>
                      <button
                        onClick={applySelected}
                        disabled={bulkApplying || Object.values(selected).filter(Boolean).length === 0}
                        style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: Object.values(selected).filter(Boolean).length > 0 ? C.green : C.border, color: "#fff", cursor: Object.values(selected).filter(Boolean).length > 0 ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600 }}>
                        {bulkApplying ? `⏳ ${t("מיישם...", "Applying...")}` : `⚡ ${t(`יישם ${Object.values(selected).filter(Boolean).length} שינויים`, `Apply ${Object.values(selected).filter(Boolean).length} Changes`)}`}
                      </button>
                    </div>

                    {bulkDone > 0 && (
                      <div style={{ marginBottom: 12, padding: "10px 16px", background: C.greenLight, border: `1px solid ${C.greenA}`, borderRadius: 8, fontSize: 13, color: C.greenText }}>
                        ✅ {t(`${bulkDone} שינויים יושמו בהצלחה`, `${bulkDone} changes applied successfully`)}
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {autoFixable.map(item => (
                        <div key={item.id} style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <input type="checkbox" checked={!!selected[item.id]}
                            onChange={e => setSelected(prev => ({ ...prev, [item.id]: e.target.checked }))}
                            style={{ marginTop: 2, accentColor: C.accent }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{lang === "he" ? item.title : item.titleEn}</span>
                              <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>{item.field}</span>
                            </div>
                            <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                              {t("הצעה: ", "Suggestion: ")}{lang === "he" ? item.suggestion : item.suggestionEn}
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
        )}
      </div>
    );
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div>
      {/* Status banner */}
      <div style={{ background: `linear-gradient(135deg, ${C.accentLight}, ${C.purpleLight})`, border: `1px solid ${C.accentA2}`, borderRadius: 12, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accentHover }}>
            {lang === "he" ? "AI SEO/GEO — ניתוח מחובר לנתוני חנות" : "AI SEO/GEO — Connected to Store Data"}
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
            {wooConnected
              ? t(`WooCommerce מחובר — ${productCount > 0 ? `${productCount} מוצרים נותחו` : "מנתח..."}`, `WooCommerce connected — ${productCount > 0 ? `${productCount} products analyzed` : "analyzing..."}`)
              : t("חבר WooCommerce ב׳חיבורים׳ לניתוח SEO אמיתי של המוצרים שלך", "Connect WooCommerce in 'Integrations' for real SEO analysis of your products")}
          </div>
        </div>
        <button onClick={runAnalysis} disabled={loadingAnalysis}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: loadingAnalysis ? C.border : C.accent, color: loadingAnalysis ? C.textMuted : "#fff", cursor: loadingAnalysis ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {loadingAnalysis ? `⏳ ${lang === "he" ? "מנתח..." : "Analyzing..."}` : `▶ ${lang === "he" ? "נתח מחדש" : "Re-analyze"}`}
        </button>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, overflowX: "auto" }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeSection === s.id ? 700 : 500, background: activeSection === s.id ? C.accent : "transparent", color: activeSection === s.id ? "#fff" : C.textSub, whiteSpace: "nowrap", transition: "all 0.15s" }}>
            {s.icon} {lang === "he" ? s.he : s.en}
          </button>
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
