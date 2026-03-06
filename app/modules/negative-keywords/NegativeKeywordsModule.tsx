"use client";
import { useState } from "react";

interface NegKwSuggestion {
  id: string;
  query: string;
  suggestedText: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  confidence: number;
  risk: string;
  reason: string;
  wasteEstimate: number;
  source: "rule" | "ai";
  selected?: boolean;
}

const RISK_COLORS: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const MATCH_COLORS = { EXACT: "#7c74ff", PHRASE: "#3b82f6", BROAD: "#8b5cf6" };

const MOCK_SUGGESTIONS: NegKwSuggestion[] = [
  { id: "1", query: "איך לתקן נעל ספורט בבית", suggestedText: "לתקן", matchType: "PHRASE", confidence: 0.94, risk: "high", reason: "שאילתת תיקון — לא קונה", wasteEstimate: 89.2, source: "rule" },
  { id: "2", query: "נעלי ריצה חינם", suggestedText: "חינם", matchType: "BROAD", confidence: 0.98, risk: "critical", reason: "מחפש חינם — לא יקנה", wasteEstimate: 67.8, source: "rule" },
  { id: "3", query: "מדריך DIY נעל ספורט", suggestedText: "diy", matchType: "PHRASE", confidence: 0.96, risk: "critical", reason: "DIY seeker — לא רלוונטי", wasteEstimate: 31.2, source: "rule" },
  { id: "4", query: "נעלי ספורט occasion deuxième", suggestedText: "יד שניה", matchType: "PHRASE", confidence: 0.91, risk: "high", reason: "מחפש יד שנייה", wasteEstimate: 45.6, source: "ai" },
  { id: "5", query: "עבודה בחנות נעליים", suggestedText: "עבודה", matchType: "PHRASE", confidence: 0.99, risk: "critical", reason: "מחפש עבודה, לא מוצר", wasteEstimate: 28.3, source: "rule" },
  { id: "6", query: "ביקורת נעלי נייקי", suggestedText: "ביקורת", matchType: "BROAD", confidence: 0.72, risk: "medium", reason: "מחקר — לא כוונת רכישה", wasteEstimate: 41.3, source: "ai" },
  { id: "7", query: "חלקי חילוף נעל", suggestedText: "חלקי חילוף", matchType: "PHRASE", confidence: 0.87, risk: "high", reason: "מחפש חלקים, לא מוצר שלם", wasteEstimate: 19.8, source: "ai" },
];

export default function NegativeKeywordsModule() {
  const [suggestions, setSuggestions] = useState(MOCK_SUGGESTIONS.map((s) => ({ ...s, selected: false })));
  const [analyzing, setAnalyzing] = useState(false);
  const [applied, setApplied] = useState(0);

  const totalWaste = suggestions.filter((s) => s.selected).reduce((sum, s) => sum + s.wasteEstimate, 0);
  const allSelected = suggestions.every((s) => s.selected);
  const toggleAll = () => setSuggestions((prev) => prev.map((s) => ({ ...s, selected: !allSelected })));
  const toggle = (id: string) => setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, selected: !s.selected } : s));

  const applySelected = async () => {
    const count = suggestions.filter((s) => s.selected).length;
    setApplied(count);
    setSuggestions((prev) => prev.filter((s) => !s.selected));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div style={{ background: "#1a1a2e", border: "1px solid #ef444433", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{suggestions.filter((s) => s.risk === "critical").length}</div>
          <div style={{ fontSize: 12, color: "#8888aa" }}>קריטי</div>
        </div>
        <div style={{ background: "#1a1a2e", border: "1px solid #f9741633", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f97316" }}>{suggestions.filter((s) => s.risk === "high").length}</div>
          <div style={{ fontSize: 12, color: "#8888aa" }}>גבוה</div>
        </div>
        <div style={{ background: "#1a1a2e", border: "1px solid #f59e0b33", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>₪{suggestions.reduce((s, k) => s + k.wasteEstimate, 0).toFixed(0)}</div>
          <div style={{ fontSize: 12, color: "#8888aa" }}>בזבוז מוערך</div>
        </div>
        <div style={{ background: "#1a1a2e", border: "1px solid #10b98133", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{applied}</div>
          <div style={{ fontSize: 12, color: "#8888aa" }}>יושמו היום</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => { setAnalyzing(true); setTimeout(() => setAnalyzing(false), 2000); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #7c74ff, #00d4aa)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          {analyzing ? "🔄 מנתח..." : "🤖 נתח עם AI"}
        </button>

        {suggestions.some((s) => s.selected) && (
          <button
            onClick={applySelected}
            style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            🚫 יישם {suggestions.filter((s) => s.selected).length} נבחרים (חיסכון ₪{totalWaste.toFixed(0)})
          </button>
        )}

        <span style={{ fontSize: 12, color: "#8888aa", marginLeft: "auto" }}>{suggestions.length} הצעות ממתינות</span>
      </div>

      {/* Table */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#13132a", borderBottom: "1px solid #2a2a4a" }}>
              <th style={{ padding: "12px 16px", width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
              </th>
              {["שאילתה מקורית", "מילה שלילית מוצעת", "סוג התאמה", "סיכון", "ביטחון", "בזבוז מוערך", "מקור"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "right", color: "#8888aa", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s) => (
              <tr
                key={s.id}
                onClick={() => toggle(s.id)}
                style={{ borderBottom: "1px solid #1e1e3a", cursor: "pointer", background: s.selected ? "#7c74ff11" : "transparent" }}
              >
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <input type="checkbox" checked={s.selected} onChange={() => toggle(s.id)} style={{ cursor: "pointer" }} />
                </td>
                <td style={{ padding: "12px 16px", color: "#e0e0ff" }}>{s.query}</td>
                <td style={{ padding: "12px 16px" }}>
                  <code style={{ background: "#7c74ff22", color: "#7c74ff", padding: "2px 8px", borderRadius: 6, fontFamily: "monospace" }}>
                    {s.suggestedText}
                  </code>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ background: `${MATCH_COLORS[s.matchType]}22`, color: MATCH_COLORS[s.matchType], padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                    {s.matchType}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ color: RISK_COLORS[s.risk], fontWeight: 600 }}>{s.risk}</span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ width: 60, height: 6, background: "#2a2a4a", borderRadius: 3 }}>
                    <div style={{ width: `${s.confidence * 100}%`, height: "100%", background: "#7c74ff", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#8888aa" }}>{Math.round(s.confidence * 100)}%</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#ef4444", fontWeight: 600 }}>₪{s.wasteEstimate.toFixed(0)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: 11, background: s.source === "ai" ? "#3b82f622" : "#8b5cf622", color: s.source === "ai" ? "#3b82f6" : "#8b5cf6", padding: "2px 8px", borderRadius: 6 }}>
                    {s.source === "ai" ? "🤖 AI" : "📏 כלל"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
