"use client";
import { useState, useMemo } from "react";
import { C } from "../theme";
import type { Lang } from "../page";

interface SearchTerm {
  query: string; intent: string; intentConfidence: number; score: number;
  riskLevel: string; recommendedAction: string; impressions: number;
  clicks: number; spend: number; conversions: number; ctr: number; cvr: number;
}

const INTENT_COLORS: Record<string, string> = { BUYER: "#10b981", RESEARCH: "#3b82f6", COMPETITOR: "#f59e0b", SUPPORT: "#f97316", IRRELEVANT: "#ef4444", LOW_INTENT: "#8b5cf6" };
const INTENT_HE: Record<string, string> = { BUYER: "קונה", RESEARCH: "מחקר", COMPETITOR: "מתחרה", SUPPORT: "תמיכה", IRRELEVANT: "לא רלוונטי", LOW_INTENT: "כוונה נמוכה" };
const INTENT_EN: Record<string, string> = { BUYER: "Buyer", RESEARCH: "Research", COMPETITOR: "Competitor", SUPPORT: "Support", IRRELEVANT: "Irrelevant", LOW_INTENT: "Low Intent" };
const RISK_COLORS: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };

const MOCK_TERMS: SearchTerm[] = [
  { query: "נעלי ריצה נייקי", intent: "BUYER", intentConfidence: 0.95, score: 88, riskLevel: "low", recommendedAction: "keep", impressions: 2340, clicks: 187, spend: 342.5, conversions: 12, ctr: 7.99, cvr: 6.42 },
  { query: "איך לתקן נעלי ספורט", intent: "SUPPORT", intentConfidence: 0.89, score: 12, riskLevel: "critical", recommendedAction: "block", impressions: 890, clicks: 45, spend: 89.2, conversions: 0, ctr: 5.06, cvr: 0 },
  { query: "נעלי ריצה חינם", intent: "LOW_INTENT", intentConfidence: 0.92, score: 8, riskLevel: "critical", recommendedAction: "block", impressions: 1200, clicks: 34, spend: 67.8, conversions: 0, ctr: 2.83, cvr: 0 },
  { query: "נעלי ריצה ביקורת", intent: "RESEARCH", intentConfidence: 0.82, score: 45, riskLevel: "medium", recommendedAction: "monitor", impressions: 560, clicks: 28, spend: 41.3, conversions: 1, ctr: 5.0, cvr: 3.57 },
  { query: "אדידס vs נייקי", intent: "COMPETITOR", intentConfidence: 0.88, score: 25, riskLevel: "high", recommendedAction: "add_negative", impressions: 430, clicks: 19, spend: 34.7, conversions: 0, ctr: 4.42, cvr: 0 },
  { query: "קנה נעלי ריצה", intent: "BUYER", intentConfidence: 0.97, score: 92, riskLevel: "low", recommendedAction: "keep", impressions: 3200, clicks: 256, spend: 489.6, conversions: 18, ctr: 8.0, cvr: 7.03 },
  { query: "מדריך נעלי ריצה DIY", intent: "IRRELEVANT", intentConfidence: 0.94, score: 4, riskLevel: "critical", recommendedAction: "block", impressions: 320, clicks: 18, spend: 31.2, conversions: 0, ctr: 5.63, cvr: 0 },
  { query: "נעלי ריצה מחיר", intent: "BUYER", intentConfidence: 0.86, score: 72, riskLevel: "low", recommendedAction: "keep", impressions: 1890, clicks: 134, spend: 212.3, conversions: 8, ctr: 7.09, cvr: 5.97 },
];

/* ── Negative Keywords data ────────────────────────────────────── */
const MOCK_NEG_KWS = [
  { id: "1", keyword: "חינם", keywordEn: "free", matchType: "BROAD", source: "AI", spend: 89.2, impressions: 1200, campaign: "Shopping - Best Sellers", status: "PENDING" },
  { id: "2", keyword: "תיקון", keywordEn: "repair", matchType: "PHRASE", source: "AI", spend: 67.8, impressions: 890, campaign: "Search - Brand", status: "PENDING" },
  { id: "3", keyword: "diy", keywordEn: "diy", matchType: "EXACT", source: "AI", spend: 31.2, impressions: 320, campaign: "Shopping - All Products", status: "PENDING" },
  { id: "4", keyword: "מדריך", keywordEn: "tutorial", matchType: "BROAD", source: "AI", spend: 45.1, impressions: 680, campaign: "Shopping - Best Sellers", status: "APPROVED" },
  { id: "5", keyword: "השכרה", keywordEn: "rental", matchType: "PHRASE", source: "Manual", spend: 0, impressions: 0, campaign: "Search - Brand", status: "APPROVED" },
];

function NegativeKeywordsTab({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [kwList, setKwList] = useState(MOCK_NEG_KWS);
  const [newKw, setNewKw] = useState("");
  const [matchType, setMatchType] = useState("BROAD");

  const approve = (id: string) => setKwList(prev => prev.map(k => k.id === id ? { ...k, status: "APPROVED" } : k));
  const reject  = (id: string) => setKwList(prev => prev.filter(k => k.id !== id));
  const addManual = () => {
    if (!newKw.trim()) return;
    setKwList(prev => [...prev, { id: Date.now().toString(), keyword: newKw, keywordEn: newKw, matchType, source: "Manual", spend: 0, impressions: 0, campaign: t("כל הקמפיינים","All Campaigns"), status: "PENDING" }]);
    setNewKw("");
  };

  const pending  = kwList.filter(k => k.status === "PENDING");
  const approved = kwList.filter(k => k.status === "APPROVED");
  const totalWaste = pending.reduce((a, k) => a + k.spend, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        {[
          { l: t("ממתינות לאישור","Pending"),  v: `${pending.length}`,  c: C.amber },
          { l: t("אושרו","Approved"),            v: `${approved.length}`, c: C.green },
          { l: t("בזבוז צפוי","Wasted Spend"),  v: `₪${Math.round(totalWaste)}`, c: C.red },
        ].map(k => (
          <div key={k.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{k.l}</div>
          </div>
        ))}
        <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))", border: `1px solid ${C.accentA}`, borderRadius: 12, padding: "14px 18px", gridColumn: "span 1" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 4 }}>✨ Gemini AI</div>
          <div style={{ fontSize: 12, color: C.textSub }}>{t("מצא 8 מילות שלילי חדשות","Found 8 new negative keywords")}</div>
        </div>
      </div>

      {/* Add manual */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>➕ {t("הוסף מילה שלילית ידנית","Add Negative Keyword Manually")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === "Enter" && addManual()}
            placeholder={t("הכנס מילה שלילית...","Enter negative keyword...")}
            style={{ flex: 1, minWidth: 180, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13 }} />
          <select value={matchType} onChange={e => setMatchType(e.target.value)}
            style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
            <option value="BROAD">Broad</option>
            <option value="PHRASE">Phrase</option>
            <option value="EXACT">Exact</option>
          </select>
          <button onClick={addManual} style={{ padding: "8px 18px", borderRadius: 8, background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {t("הוסף","Add")}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>🚫 {t("מילות שלילי","Negative Keywords")} ({kwList.length})</div>
          {pending.length > 0 && (
            <button onClick={() => setKwList(prev => prev.map(k => ({ ...k, status: "APPROVED" })))}
              style={{ padding: "6px 14px", borderRadius: 8, background: C.green, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              ✅ {t("אשר הכל","Approve All")}
            </button>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: C.cardAlt }}>
              {[t("מילה","Keyword"), t("סוג","Match"), t("מקור","Source"), t("קמפיין","Campaign"), t("בזבוז","Waste"), t("סטטוס","Status"), t("פעולה","Action")].map(h => (
                <th key={h} style={{ padding: "9px 14px", textAlign: "start", color: C.textMuted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kwList.map(kw => (
              <tr key={kw.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "9px 14px", color: C.text, fontWeight: 600 }}>[{kw.matchType === "EXACT" ? `="${kw.keyword}"` : kw.matchType === "PHRASE" ? `"${kw.keyword}"` : kw.keyword}]</td>
                <td style={{ padding: "9px 14px" }}><span style={{ fontSize: 10, background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 7px", color: C.textSub }}>{kw.matchType}</span></td>
                <td style={{ padding: "9px 14px", color: kw.source === "AI" ? C.accent : C.textSub, fontSize: 12 }}>{kw.source === "AI" ? "✨ AI" : "👤 Manual"}</td>
                <td style={{ padding: "9px 14px", color: C.textSub, fontSize: 12 }}>{lang === "he" ? kw.campaign : kw.campaign}</td>
                <td style={{ padding: "9px 14px", color: kw.spend > 0 ? C.red : C.textMuted }}>₪{kw.spend.toFixed(0)}</td>
                <td style={{ padding: "9px 14px" }}>
                  <span style={{ fontSize: 11, background: kw.status === "APPROVED" ? C.greenLight : C.amberLight, color: kw.status === "APPROVED" ? C.green : C.amber, borderRadius: 8, padding: "2px 8px", fontWeight: 600 }}>
                    {kw.status === "APPROVED" ? t("✓ אושר","✓ Approved") : t("⏳ ממתין","⏳ Pending")}
                  </span>
                </td>
                <td style={{ padding: "9px 14px" }}>
                  {kw.status === "PENDING" ? (
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => approve(kw.id)} style={{ padding: "4px 10px", borderRadius: 6, background: C.green, color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>✓</button>
                      <button onClick={() => reject(kw.id)}  style={{ padding: "4px 10px", borderRadius: 6, background: C.red,   color: "#fff", border: "none", cursor: "pointer", fontSize: 11 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => reject(kw.id)} style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", fontSize: 11 }}>{t("הסר","Remove")}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchAnalysisTab({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"spend" | "score" | "conversions">("spend");

  const INTENT_LABELS = lang === "he" ? INTENT_HE : INTENT_EN;

  const filtered = useMemo(() => MOCK_TERMS
    .filter((t) => !search || t.query.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => intentFilter === "all" || t.intent === intentFilter)
    .filter((t) => riskFilter === "all" || t.riskLevel === riskFilter)
    .sort((a, b) => b[sortBy] - a[sortBy]), [search, intentFilter, riskFilter, sortBy]);

  const distribution = useMemo(() => { const d: Record<string, number> = {}; MOCK_TERMS.forEach((t) => { d[t.intent] = (d[t.intent] || 0) + 1; }); return d; }, []);

  const actionLabel = (a: string) => {
    const map: Record<string, [string, string]> = { keep: ["✅ שמור", "✅ Keep"], block: ["🚫 חסום", "🚫 Block"], add_negative: ["➖ שלילי", "➖ Negative"], monitor: ["👁️ עקוב", "👁️ Monitor"] };
    return t(...(map[a] || [a, a]));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "var(--c-text)" }}>📊 {t("התפלגות כוונת חיפוש", "Search Intent Distribution")}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(distribution).map(([intent, count]) => (
            <div key={intent} onClick={() => setIntentFilter(intentFilter === intent ? "all" : intent)}
              style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 20, background: `${INTENT_COLORS[intent]}${intentFilter === intent ? "33" : "11"}`, border: `1px solid ${INTENT_COLORS[intent]}${intentFilter === intent ? "88" : "33"}`, color: INTENT_COLORS[intent], fontSize: 13, fontWeight: 600 }}>
              {INTENT_LABELS[intent]} ({count})
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("🔍 חפש שאילתה...", "🔍 Search query...")}
          style={{ flex: 1, minWidth: 160, background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", borderRadius: 8, padding: "8px 14px", fontSize: 13, outline: "none" }} />
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="all">{t("כל רמות הסיכון", "All Risk Levels")}</option>
          <option value="critical">{t("קריטי", "Critical")}</option>
          <option value="high">{t("גבוה", "High")}</option>
          <option value="medium">{t("בינוני", "Medium")}</option>
          <option value="low">{t("נמוך", "Low")}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="spend">{t("מיין לפי הוצאה", "Sort by Spend")}</option>
          <option value="score">{t("מיין לפי ציון", "Sort by Score")}</option>
          <option value="conversions">{t("מיין לפי המרות", "Sort by Conversions")}</option>
        </select>
        <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #3b82f6", background: "#3b82f611", color: "#3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          🤖 {t("סווג הכל עם AI", "Classify All with AI")}
        </button>
      </div>

      <div style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ background: "var(--c-card-alt)", borderBottom: "1px solid var(--c-border)" }}>
                {[t("שאילתת חיפוש","Search Query"), t("כוונה","Intent"), t("ציון","Score"), t("סיכון","Risk"), t("פעולה מומלצת","Recommended Action"), t("קליקים","Clicks"), t("הוצאה","Spend"), t("המרות","Conversions"), "CVR"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "start", color: "var(--c-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((term, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e1e3a" }}>
                  <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 500 }}>{term.query}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: `${INTENT_COLORS[term.intent]}22`, color: INTENT_COLORS[term.intent], padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {INTENT_LABELS[term.intent]}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 40, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${term.score}%`, height: "100%", background: term.score >= 60 ? "#10b981" : term.score >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                      </div>
                      <span style={{ color: "#1e293b" }}>{term.score}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: RISK_COLORS[term.riskLevel], fontWeight: 600, fontSize: 12 }}>
                      {term.riskLevel === "critical" ? "🔴" : term.riskLevel === "high" ? "🟠" : term.riskLevel === "medium" ? "🟡" : "🟢"} {term.riskLevel}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 8, background: term.recommendedAction === "keep" ? "#10b98122" : term.recommendedAction === "block" ? "#ef444422" : "#f59e0b22", color: term.recommendedAction === "keep" ? "#10b981" : term.recommendedAction === "block" ? "#ef4444" : "#f59e0b" }}>
                      {actionLabel(term.recommendedAction)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#1e293b" }}>{term.clicks.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", color: "#1e293b" }}>₪{term.spend.toFixed(0)}</td>
                  <td style={{ padding: "12px 16px", color: term.conversions > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{term.conversions}</td>
                  <td style={{ padding: "12px 16px", color: "#1e293b" }}>{term.cvr.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Root Export ─────────────────────────────────────────────── */
export default function SearchTermsModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [tab, setTab] = useState<"analysis"|"negatives">("analysis");
  const TABS = [
    { id: "analysis",  label: t("ניתוח חיפושים","Search Analysis"),  icon: "🔍" },
    { id: "negatives", label: t("מילות שליליות","Negative Keywords"), icon: "🚫" },
  ] as const;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, background: C.card, padding: "0 20px" }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: "12px 20px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === tb.id ? 700 : 400,
            color: tab === tb.id ? C.accent : C.textMuted,
            borderBottom: `2px solid ${tab === tb.id ? C.accent : "transparent"}`,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 20 }}>
        {tab === "analysis"  && <SearchAnalysisTab lang={lang} />}
        {tab === "negatives" && <NegativeKeywordsTab lang={lang} />}
      </div>
    </div>
  );
}
