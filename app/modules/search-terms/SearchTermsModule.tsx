"use client";
import { useState, useMemo } from "react";
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

export default function SearchTermsModule({ lang }: { lang: Lang }) {
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
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>📊 {t("התפלגות כוונת חיפוש", "Search Intent Distribution")}</h3>
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
          style={{ flex: 1, minWidth: 200, background: "#ffffff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: 8, padding: "8px 14px", fontSize: 13, outline: "none" }} />
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="all">{t("כל רמות הסיכון", "All Risk Levels")}</option>
          <option value="critical">{t("קריטי", "Critical")}</option>
          <option value="high">{t("גבוה", "High")}</option>
          <option value="medium">{t("בינוני", "Medium")}</option>
          <option value="low">{t("נמוך", "Low")}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="spend">{t("מיין לפי הוצאה", "Sort by Spend")}</option>
          <option value="score">{t("מיין לפי ציון", "Sort by Score")}</option>
          <option value="conversions">{t("מיין לפי המרות", "Sort by Conversions")}</option>
        </select>
        <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #3b82f6", background: "#3b82f611", color: "#3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          🤖 {t("סווג הכל עם AI", "Classify All with AI")}
        </button>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {[t("שאילתת חיפוש","Search Query"), t("כוונה","Intent"), t("ציון","Score"), t("סיכון","Risk"), t("פעולה מומלצת","Recommended Action"), t("קליקים","Clicks"), t("הוצאה","Spend"), t("המרות","Conversions"), "CVR"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>{h}</th>
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
