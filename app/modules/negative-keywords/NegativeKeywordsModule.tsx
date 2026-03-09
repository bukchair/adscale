"use client";
import { useState } from "react";
import type { Lang } from "../page";

interface NegKwSuggestion {
  id: string; query: string; suggestedText: string;
  matchType: "EXACT" | "PHRASE" | "BROAD"; confidence: number;
  risk: string; reason: string; reasonEn: string; wasteEstimate: number; source: "rule" | "ai";
  selected?: boolean;
}

const RISK_COLORS: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const RISK_HE: Record<string, string> = { low: "נמוך", medium: "בינוני", high: "גבוה", critical: "קריטי" };
const RISK_EN: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const MATCH_COLORS = { EXACT: "#7c74ff", PHRASE: "#3b82f6", BROAD: "#8b5cf6" };

const MOCK_SUGGESTIONS: NegKwSuggestion[] = [
  { id: "1", query: "איך לתקן נעל ספורט בבית", suggestedText: "לתקן", matchType: "PHRASE", confidence: 0.94, risk: "high", reason: "שאילתת תיקון — לא קונה", reasonEn: "Repair query — not a buyer", wasteEstimate: 89.2, source: "rule" },
  { id: "2", query: "נעלי ריצה חינם", suggestedText: "חינם", matchType: "BROAD", confidence: 0.98, risk: "critical", reason: "מחפש חינם — לא יקנה", reasonEn: "Looking for free — won't buy", wasteEstimate: 67.8, source: "rule" },
  { id: "3", query: "מדריך DIY נעל ספורט", suggestedText: "diy", matchType: "PHRASE", confidence: 0.96, risk: "critical", reason: "DIY — לא רלוונטי", reasonEn: "DIY seeker — not relevant", wasteEstimate: 31.2, source: "rule" },
  { id: "4", query: "נעלי ספורט יד שניה", suggestedText: "יד שניה", matchType: "PHRASE", confidence: 0.91, risk: "high", reason: "מחפש יד שנייה", reasonEn: "Looking for second-hand", wasteEstimate: 45.6, source: "ai" },
  { id: "5", query: "עבודה בחנות נעליים", suggestedText: "עבודה", matchType: "PHRASE", confidence: 0.99, risk: "critical", reason: "מחפש עבודה, לא מוצר", reasonEn: "Looking for a job, not a product", wasteEstimate: 28.3, source: "rule" },
  { id: "6", query: "ביקורת נעלי נייקי", suggestedText: "ביקורת", matchType: "BROAD", confidence: 0.72, risk: "medium", reason: "מחקר — לא כוונת רכישה", reasonEn: "Research — no purchase intent", wasteEstimate: 41.3, source: "ai" },
  { id: "7", query: "חלקי חילוף נעל", suggestedText: "חלקי חילוף", matchType: "PHRASE", confidence: 0.87, risk: "high", reason: "מחפש חלקים, לא מוצר שלם", reasonEn: "Looking for parts, not whole product", wasteEstimate: 19.8, source: "ai" },
];

export default function NegativeKeywordsModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [suggestions, setSuggestions] = useState(MOCK_SUGGESTIONS.map((s) => ({ ...s, selected: false })));
  const [analyzing, setAnalyzing] = useState(false);
  const [applied, setApplied] = useState(0);

  const RISK_LABELS = lang === "he" ? RISK_HE : RISK_EN;
  const totalWaste = suggestions.filter((s) => s.selected).reduce((sum, s) => sum + s.wasteEstimate, 0);
  const allSelected = suggestions.every((s) => s.selected);
  const toggleAll = () => setSuggestions((prev) => prev.map((s) => ({ ...s, selected: !allSelected })));
  const toggle = (id: string) => setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, selected: !s.selected } : s));
  const applySelected = async () => { const count = suggestions.filter((s) => s.selected).length; setApplied(count); setSuggestions((prev) => prev.filter((s) => !s.selected)); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="as-stats-grid">
        <div style={{ background: "var(--c-card)", border: "1px solid #ef444433", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{suggestions.filter((s) => s.risk === "critical").length}</div>
          <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{t("קריטי", "Critical")}</div>
        </div>
        <div style={{ background: "var(--c-card)", border: "1px solid #f9741633", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f97316" }}>{suggestions.filter((s) => s.risk === "high").length}</div>
          <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{t("גבוה", "High")}</div>
        </div>
        <div style={{ background: "var(--c-card)", border: "1px solid #f59e0b33", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>₪{suggestions.reduce((s, k) => s + k.wasteEstimate, 0).toFixed(0)}</div>
          <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{t("בזבוז מוערך", "Estimated Waste")}</div>
        </div>
        <div style={{ background: "var(--c-card)", border: "1px solid #10b98133", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{applied}</div>
          <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{t("יושמו היום", "Applied Today")}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => { setAnalyzing(true); setTimeout(() => setAnalyzing(false), 2000); }} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
          {analyzing ? t("🔄 מנתח...", "🔄 Analyzing...") : t("🤖 נתח עם AI", "🤖 Analyze with AI")}
        </button>
        {suggestions.some((s) => s.selected) && (
          <button onClick={applySelected} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            🚫 {t("יישם", "Apply")} {suggestions.filter((s) => s.selected).length} {t("נבחרים", "selected")} ({t("חיסכון", "save")} ₪{totalWaste.toFixed(0)})
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--c-text-muted)", marginInlineStart: "auto" }}>{suggestions.length} {t("הצעות ממתינות", "pending suggestions")}</span>
      </div>

      <div className="as-profit-table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "var(--c-bg)", borderBottom: "1px solid var(--c-border)" }}>
              <th style={{ padding: "12px 16px", width: 40 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} /></th>
              {[t("שאילתה מקורית","Original Query"), t("מילה שלילית מוצעת","Suggested Negative"), t("סוג התאמה","Match Type"), t("סיכון","Risk"), t("ביטחון","Confidence"), t("בזבוז מוערך","Est. Waste"), t("מקור","Source")].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "start", color: "var(--c-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s) => (
              <tr key={s.id} onClick={() => toggle(s.id)} style={{ borderBottom: "1px solid var(--c-border)", cursor: "pointer", background: s.selected ? "#7c74ff11" : "transparent" }}>
                <td style={{ padding: "12px 16px", textAlign: "center" }}><input type="checkbox" checked={s.selected} onChange={() => toggle(s.id)} style={{ cursor: "pointer" }} /></td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ color: "var(--c-text)" }}>{s.query}</div>
                  <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2 }}>{lang === "he" ? s.reason : s.reasonEn}</div>
                </td>
                <td style={{ padding: "12px 16px" }}><code style={{ background: "#7c74ff22", color: "#6366f1", padding: "2px 8px", borderRadius: 6, fontFamily: "monospace" }}>{s.suggestedText}</code></td>
                <td style={{ padding: "12px 16px" }}><span style={{ background: `${MATCH_COLORS[s.matchType]}22`, color: MATCH_COLORS[s.matchType], padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{s.matchType}</span></td>
                <td style={{ padding: "12px 16px" }}><span style={{ color: RISK_COLORS[s.risk], fontWeight: 600 }}>{RISK_LABELS[s.risk]}</span></td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ width: 60, height: 6, background: "var(--c-border)", borderRadius: 3 }}><div style={{ width: `${s.confidence * 100}%`, height: "100%", background: "#6366f1", borderRadius: 3 }} /></div>
                  <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{Math.round(s.confidence * 100)}%</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#ef4444", fontWeight: 600 }}>₪{s.wasteEstimate.toFixed(0)}</td>
                <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, background: s.source === "ai" ? "#3b82f622" : "#8b5cf622", color: s.source === "ai" ? "#3b82f6" : "#8b5cf6", padding: "2px 8px", borderRadius: 6 }}>{s.source === "ai" ? "🤖 AI" : t("📏 כלל", "📏 Rule")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
