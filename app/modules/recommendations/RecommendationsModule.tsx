"use client";
import { useState } from "react";
import type { Lang } from "../page";

interface Recommendation {
  id: string; type: string; title: string; titleEn: string;
  reason: string; reasonEn: string;
  confidence: number; severity: "low" | "medium" | "high" | "critical";
  expectedImpact: string; expectedImpactEn: string;
  campaign?: { name: string }; createdAt: string; status: string;
}

const SEVERITY_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const SEVERITY_HE = { low: "נמוך", medium: "בינוני", high: "גבוה", critical: "קריטי" };
const SEVERITY_EN = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const TYPE_ICONS: Record<string, string> = {
  BUDGET_OPTIMIZATION: "💰", NEGATIVE_KEYWORD: "🚫", CREATIVE_REFRESH: "✍️",
  BID_ADJUSTMENT: "🎯", PROFIT_IMPROVEMENT: "📈", CAMPAIGN_RESTRUCTURE: "🔧",
};

const MOCK_RECS: Recommendation[] = [
  { id: "1", type: "BUDGET_OPTIMIZATION", title: "הגדל תקציב — קמפיין Shopping ביצועים גבוהים", titleEn: "Increase budget — high-performing Shopping campaign", reason: "POAS 2.8x, פוטנציאל הכנסה מוחמץ של ₪3,200 בשבוע בגלל מגבלת תקציב", reasonEn: "POAS 2.8x, missed revenue potential of ₪3,200/week due to budget cap", confidence: 0.92, severity: "high", expectedImpact: "+₪3,200/שבוע הכנסה", expectedImpactEn: "+₪3,200/week revenue", campaign: { name: "Shopping - Best Sellers" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "2", type: "NEGATIVE_KEYWORD", title: "הוסף 8 מילות מפתח שליליות", titleEn: "Add 8 negative keywords", reason: "זוהו 8 שאילתות חיפוש עם הוצאה מצטברת ₪1,240 ואפס המרות", reasonEn: "8 search queries identified with ₪1,240 total spend and zero conversions", confidence: 0.97, severity: "critical", expectedImpact: "חיסכון ₪1,240/חודש", expectedImpactEn: "Save ₪1,240/month", campaign: { name: "Search - Brand" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "3", type: "CREATIVE_REFRESH", title: "רענן קריאייטיב — ירידה ב-CTR", titleEn: "Refresh creative — CTR declining", reason: "ה-CTR ירד ב-34% ב-30 יום האחרונים. הקריאייטיב לא עודכן 127 ימים", reasonEn: "CTR dropped 34% in the last 30 days. Creative not updated for 127 days", confidence: 0.78, severity: "medium", expectedImpact: "+20-30% CTR לאחר רענון", expectedImpactEn: "+20-30% CTR after refresh", campaign: { name: "Meta - Remarketing" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "4", type: "PROFIT_IMPROVEMENT", title: "הורד תקציב — קמפיין הפסדי", titleEn: "Reduce budget — losing campaign", reason: "הקמפיין הפסיד ₪890 ב-14 יום האחרונים. POAS: -0.3x", reasonEn: "Campaign lost ₪890 over the last 14 days. POAS: -0.3x", confidence: 0.88, severity: "critical", expectedImpact: "עצור הפסד של ₪63/יום", expectedImpactEn: "Stop ₪63/day loss", campaign: { name: "Google - Competitors" }, createdAt: new Date().toISOString(), status: "PENDING" },
  { id: "5", type: "BID_ADJUSTMENT", title: "הפחת הצעות מחיר למכשיר נייד", titleEn: "Reduce mobile device bids", reason: "שיעור המרה נמוך ב-60% במכשיר נייד לעומת דסקטופ", reasonEn: "Conversion rate 60% lower on mobile vs desktop", confidence: 0.71, severity: "medium", expectedImpact: "-15% CPA במובייל", expectedImpactEn: "-15% mobile CPA", campaign: { name: "Shopping - All Products" }, createdAt: new Date().toISOString(), status: "PENDING" },
];

export default function RecommendationsModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [recs, setRecs] = useState<Recommendation[]>(MOCK_RECS);
  const [filter, setFilter] = useState("all");
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("SUGGESTION");

  const filtered = filter === "all" ? recs : recs.filter((r) => r.severity === filter);
  const dismiss = (id: string) => setRecs((prev) => prev.filter((r) => r.id !== id));
  const approveAll = () => setRecs((prev) => prev.map((r) => ({ ...r, status: "APPROVED" })));
  const runAnalysis = async () => { setRunning(true); await new Promise((r) => setTimeout(r, 2000)); setRunning(false); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Controls row — wraps on mobile */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text)", borderRadius: 8, padding: "8px 12px", fontSize: 13, minHeight: 38 }}>
          <option value="DRY_RUN">{t("🔍 סימולציה בלבד", "🔍 Dry Run Only")}</option>
          <option value="SUGGESTION">{t("💡 הצעות בלבד", "💡 Suggestions Only")}</option>
          <option value="APPROVAL_REQUIRED">{t("✅ דורש אישור", "✅ Approval Required")}</option>
          <option value="AUTOMATED">{t("⚡ אוטומטי מלא", "⚡ Fully Automated")}</option>
        </select>
        <button onClick={runAnalysis} disabled={running} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: running ? "var(--c-border)" : "#6366f1", color: "#fff", cursor: running ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, minHeight: 38, whiteSpace: "nowrap" }}>
          {running ? t("🔄 מנתח...", "🔄 Analyzing...") : t("🤖 הפעל ניתוח AI", "🤖 Run AI Analysis")}
        </button>
        {recs.some((r) => r.status === "PENDING") && (
          <button onClick={approveAll} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600, minHeight: 38, whiteSpace: "nowrap" }}>
            ✅ {t("אשר הכל", "Approve All")}
          </button>
        )}
      </div>
      {/* Severity filter row — scrollable on mobile */}
      <div className="as-tab-scroll" style={{ display: "flex", gap: 8 }}>
        {["all", "critical", "high", "medium", "low"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, flexShrink: 0, background: filter === f ? (f === "all" ? "#7c74ff" : SEVERITY_COLORS[f as keyof typeof SEVERITY_COLORS]) : "var(--c-card)", color: filter === f ? "#fff" : "var(--c-text-muted)", border: `1px solid ${filter === f ? "transparent" : "var(--c-border)"}` }}>
            {f === "all" ? t("הכל", "All") : (lang === "he" ? SEVERITY_HE : SEVERITY_EN)[f as keyof typeof SEVERITY_HE]}
          </button>
        ))}
      </div>

      <div className="as-tab-scroll" style={{ display: "flex", gap: 10 }}>
        {(["critical", "high", "medium", "low"] as const).map((s) => {
          const count = recs.filter((r) => r.severity === s).length;
          return (
            <div key={s} style={{ background: `${SEVERITY_COLORS[s]}11`, border: `1px solid ${SEVERITY_COLORS[s]}33`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: SEVERITY_COLORS[s] }}>{count}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{(lang === "he" ? SEVERITY_HE : SEVERITY_EN)[s]}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40, textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div>{t("אין המלצות ממתינות — הכל מעודכן!", "No pending recommendations — everything is up to date!")}</div>
          </div>
        )}
        {filtered.map((rec) => (
          <div key={rec.id} style={{ background: "var(--c-card)", border: `1px solid ${SEVERITY_COLORS[rec.severity]}33`, borderInlineEnd: `4px solid ${SEVERITY_COLORS[rec.severity]}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICONS[rec.type] || "🎯"}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{lang === "he" ? rec.title : rec.titleEn}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${SEVERITY_COLORS[rec.severity]}22`, color: SEVERITY_COLORS[rec.severity], fontWeight: 600, whiteSpace: "nowrap" }}>
                    {(lang === "he" ? SEVERITY_HE : SEVERITY_EN)[rec.severity]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--c-text-muted)", marginBottom: 8, lineHeight: 1.5 }}>{lang === "he" ? rec.reason : rec.reasonEn}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {rec.campaign && <span style={{ fontSize: 12, color: "#6366f1", background: "#7c74ff11", padding: "2px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>📊 {rec.campaign.name}</span>}
                  <span style={{ fontSize: 12, color: "#10b981", whiteSpace: "nowrap" }}>⚡ {lang === "he" ? rec.expectedImpact : rec.expectedImpactEn}</span>
                  <span style={{ fontSize: 12, color: "var(--c-text-muted)", whiteSpace: "nowrap" }}>{t("ביטחון", "Confidence")}: {Math.round(rec.confidence * 100)}%</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {rec.status === "PENDING" ? (
                  <>
                    <button onClick={() => setRecs((prev) => prev.map((r) => r.id === rec.id ? { ...r, status: "APPROVED" } : r))} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                      ✅ {t("אשר", "Approve")}
                    </button>
                    <button onClick={() => dismiss(rec.id)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text-muted)", cursor: "pointer", fontSize: 12, minHeight: 36 }}>✕</button>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600, whiteSpace: "nowrap" }}>✅ {t("אושר", "Approved")}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
