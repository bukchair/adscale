"use client";
import { useState, useEffect } from "react";

interface Recommendation {
  id: string;
  type: string;
  title: string;
  reason: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  expectedImpact: string;
  campaign?: { name: string };
  createdAt: string;
  status: string;
}

const SEVERITY_COLORS = {
  low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444"
};
const SEVERITY_LABELS = {
  low: "נמוך", medium: "בינוני", high: "גבוה", critical: "קריטי"
};
const TYPE_ICONS: Record<string, string> = {
  BUDGET_OPTIMIZATION: "💰", NEGATIVE_KEYWORD: "🚫", CREATIVE_REFRESH: "✍️",
  BID_ADJUSTMENT: "🎯", PROFIT_IMPROVEMENT: "📈", CAMPAIGN_RESTRUCTURE: "🔧",
};

// Mock data for demo
const MOCK_RECS: Recommendation[] = [
  { id: "1", type: "BUDGET_OPTIMIZATION", title: "הגדל תקציב — קמפיין Shopping ביצועים גבוהים", reason: "POAS 2.8x, פוטנציאל הכנסה מוחמץ של ₪3,200 בשבוע בגלל מגבלת תקציב", confidence: 0.92, severity: "high", expectedImpact: "+₪3,200/שבוע הכנסה", campaign: { name: "Shopping - Best Sellers" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "2", type: "NEGATIVE_KEYWORD", title: "הוסף 8 מילות מפתח שליליות", reason: "זוהו 8 שאילתות חיפוש עם הוצאה מצטברת ₪1,240 ואפס המרות", confidence: 0.97, severity: "critical", expectedImpact: "חיסכון ₪1,240/חודש", campaign: { name: "Search - Brand" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "3", type: "CREATIVE_REFRESH", title: "רענן קריאייטיב — ירידה ב-CTR", reason: "ה-CTR ירד ב-34% ב-30 יום האחרונים. הקריאייטיב לא עודכן 127 ימים", confidence: 0.78, severity: "medium", expectedImpact: "+20-30% CTR לאחר רענון", campaign: { name: "Meta - Remarketing" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "4", type: "PROFIT_IMPROVEMENT", title: "הורד תקציב — קמפיין הפסדי", reason: "הקמפיין הפסיד ₪890 ב-14 יום האחרונים. POAS: -0.3x", confidence: 0.88, severity: "critical", expectedImpact: "עצור הפסד של ₪63/יום", campaign: { name: "Google - Competitors" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "5", type: "BID_ADJUSTMENT", title: "הפחת הצעות מחיר למכשיר נייד", reason: "שיעור המרה נמוב ב-60% במכשיר נייד לעומת דסקטופ", confidence: 0.71, severity: "medium", expectedImpact: "-15% CPA במובייל", campaign: { name: "Shopping - All Products" }, createdAt: new Date().toISOString(), status: "PENDING" },
];

export default function RecommendationsModule() {
  const [recs, setRecs] = useState<Recommendation[]>(MOCK_RECS);
  const [filter, setFilter] = useState("all");
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("SUGGESTION");

  const filtered = filter === "all" ? recs : recs.filter((r) => r.severity === filter);

  const dismiss = (id: string) => setRecs((prev) => prev.filter((r) => r.id !== id));
  const approveAll = () => setRecs((prev) => prev.map((r) => ({ ...r, status: "APPROVED" })));

  const runAnalysis = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setRunning(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ background: "#1a1a2e", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}
        >
          <option value="DRY_RUN">🔍 סימולציה בלבד</option>
          <option value="SUGGESTION">💡 הצעות בלבד</option>
          <option value="APPROVAL_REQUIRED">✅ דורש אישור</option>
          <option value="AUTOMATED">⚡ אוטומטי מלא</option>
        </select>

        <button
          onClick={runAnalysis}
          disabled={running}
          style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: running ? "#3a3a5a" : "linear-gradient(135deg, #7c74ff, #00d4aa)", color: "#fff", cursor: running ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
        >
          {running ? "🔄 מנתח..." : "🤖 הפעל ניתוח AI"}
        </button>

        {recs.some((r) => r.status === "PENDING") && (
          <button
            onClick={approveAll}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            ✅ אשר הכל
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["all", "critical", "high", "medium", "low"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12,
                background: filter === f ? (f === "all" ? "#7c74ff" : SEVERITY_COLORS[f as keyof typeof SEVERITY_COLORS]) : "#1a1a2e",
                color: filter === f ? "#fff" : "#8888aa",
              }}
            >
              {f === "all" ? "הכל" : SEVERITY_LABELS[f as keyof typeof SEVERITY_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12 }}>
        {(["critical", "high", "medium", "low"] as const).map((s) => {
          const count = recs.filter((r) => r.severity === s).length;
          return (
            <div key={s} style={{ background: `${SEVERITY_COLORS[s]}11`, border: `1px solid ${SEVERITY_COLORS[s]}33`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: SEVERITY_COLORS[s] }}>{count}</div>
              <div style={{ fontSize: 11, color: "#8888aa" }}>{SEVERITY_LABELS[s]}</div>
            </div>
          );
        })}
      </div>

      {/* Recommendations Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 40, textAlign: "center", color: "#8888aa" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div>אין המלצות ממתינות — הכל מעודכן!</div>
          </div>
        )}
        {filtered.map((rec) => (
          <div
            key={rec.id}
            style={{
              background: "#1a1a2e",
              border: `1px solid ${SEVERITY_COLORS[rec.severity]}33`,
              borderRight: `4px solid ${SEVERITY_COLORS[rec.severity]}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[rec.type] || "🎯"}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{rec.title}</span>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: `${SEVERITY_COLORS[rec.severity]}22`,
                    color: SEVERITY_COLORS[rec.severity], fontWeight: 600,
                  }}>
                    {SEVERITY_LABELS[rec.severity]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#a0a0c0", marginBottom: 8 }}>{rec.reason}</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {rec.campaign && (
                    <span style={{ fontSize: 12, color: "#7c74ff", background: "#7c74ff11", padding: "2px 10px", borderRadius: 6 }}>
                      📊 {rec.campaign.name}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "#10b981" }}>⚡ {rec.expectedImpact}</span>
                  <span style={{ fontSize: 12, color: "#8888aa" }}>ביטחון: {Math.round(rec.confidence * 100)}%</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {rec.status === "PENDING" ? (
                  <>
                    <button
                      onClick={() => setRecs((prev) => prev.map((r) => r.id === rec.id ? { ...r, status: "APPROVED" } : r))}
                      style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      ✅ אשר
                    </button>
                    <button
                      onClick={() => dismiss(rec.id)}
                      style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #3a3a5a", background: "transparent", color: "#8888aa", cursor: "pointer", fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✅ אושר</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
