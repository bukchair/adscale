"use client";
import { useState } from "react";
import type { Lang } from "../page";

interface ApprovalRequest {
  id: string; title: string; titleEn: string; reason: string; reasonEn: string;
  type: string; campaign: string; riskLevel: "low" | "medium" | "high" | "critical";
  expectedImpact: string; expectedImpactEn: string; confidence: number;
  payload: Record<string, any>; status: "PENDING" | "APPROVED" | "REJECTED";
  autoApproveAt?: string; createdAt: string;
}

const RISK_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const RISK_HE = { low: "נמוך", medium: "בינוני", high: "גבוה", critical: "קריטי" };
const RISK_EN = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

const MOCK_APPROVALS: ApprovalRequest[] = [
  { id: "1", title: "הוסף 5 מילות מפתח שליליות", titleEn: "Add 5 negative keywords", reason: "זוהו שאילתות עם הוצאה של ₪890 ואפס המרות", reasonEn: "Queries identified with ₪890 spend and zero conversions", type: "ADD_NEGATIVE_KEYWORD", campaign: "Shopping - Best Sellers", riskLevel: "high", expectedImpact: "חיסכון ₪890/חודש", expectedImpactEn: "Save ₪890/month", confidence: 0.94, payload: { keywords: ["חינם", "תיקון", "diy", "מדריך", "עבודה"] }, status: "PENDING", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", title: "הגדל תקציב ב-₪100/יום", titleEn: "Increase budget by ₪100/day", reason: "קמפיין מנצל 68% מהתקציב, POAS 2.8x — פוטנציאל צמיחה", reasonEn: "Campaign utilizing 68% of budget, POAS 2.8x — growth potential", type: "RAISE_BUDGET", campaign: "Shopping - Best Sellers", riskLevel: "low", expectedImpact: "+₪3,200 הכנסה שבועית", expectedImpactEn: "+₪3,200 weekly revenue", confidence: 0.87, payload: { from: 500, to: 600 }, status: "PENDING", autoApproveAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "3", title: "הפסק קמפיין הפסדי", titleEn: "Pause losing campaign", reason: "הקמפיין הפסיד ₪652 ב-14 יום. POAS: -0.35x", reasonEn: "Campaign lost ₪652 over 14 days. POAS: -0.35x", type: "PAUSE_CAMPAIGN", campaign: "Google - Competitors", riskLevel: "critical", expectedImpact: "עצור הפסד ₪46/יום", expectedImpactEn: "Stop ₪46/day loss", confidence: 0.92, payload: { campaignId: "123" }, status: "PENDING", createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "4", title: "שנה אסטרטגיית הצעת מחיר", titleEn: "Change bidding strategy", reason: "מעבר מ-Manual CPC ל-Target ROAS 5x על פי ביצועים", reasonEn: "Switch from Manual CPC to Target ROAS 5x based on performance", type: "ADJUST_BID", campaign: "Search - Brand", riskLevel: "medium", expectedImpact: "+18% המרות", expectedImpactEn: "+18% conversions", confidence: 0.74, payload: { strategy: "TARGET_ROAS", target: 5.0 }, status: "PENDING", autoApproveAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date(Date.now() - 5400000).toISOString() },
];

const TYPE_ICONS: Record<string, string> = { ADD_NEGATIVE_KEYWORD: "🚫", RAISE_BUDGET: "📈", LOWER_BUDGET: "📉", PAUSE_CAMPAIGN: "⏸️", ADJUST_BID: "🎯", SUGGEST_CREATIVE: "✍️" };

export default function ApprovalsModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [requests, setRequests] = useState(MOCK_APPROVALS);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const RISK_LABELS = lang === "he" ? RISK_HE : RISK_EN;
  const pending = requests.filter((r) => r.status === "PENDING");
  const approve = (id: string) => setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "APPROVED" } : r));
  const reject = (id: string) => setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "REJECTED" } : r));
  const approveAll = () => setRequests((prev) => prev.map((r) => r.riskLevel !== "critical" ? { ...r, status: "APPROVED" } : r));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {(["critical", "high", "medium", "low"] as const).map((r) => (
            <div key={r} style={{ background: `${RISK_COLORS[r]}11`, border: `1px solid ${RISK_COLORS[r]}33`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: RISK_COLORS[r] }}>{pending.filter((req) => req.riskLevel === r).length}</div>
              <div style={{ fontSize: 11, color: "#8888aa" }}>{RISK_LABELS[r]}</div>
            </div>
          ))}
        </div>
        {pending.length > 0 && (
          <button onClick={approveAll} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ✅ {t("אשר כל הנמוך/בינוני", "Approve Low/Medium Risk")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {requests.map((req) => (
          <div key={req.id} style={{ background: "#1a1a2e", border: `1px solid ${RISK_COLORS[req.riskLevel]}33`, borderRight: `4px solid ${RISK_COLORS[req.riskLevel]}`, borderRadius: 12, padding: 20, opacity: req.status !== "PENDING" ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[req.type] || "🎯"}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{lang === "he" ? req.title : req.titleEn}</span>
                  <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${RISK_COLORS[req.riskLevel]}22`, color: RISK_COLORS[req.riskLevel], fontWeight: 600 }}>
                    {RISK_LABELS[req.riskLevel]}
                  </span>
                  {req.status !== "PENDING" && (
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: req.status === "APPROVED" ? "#10b98122" : "#ef444422", color: req.status === "APPROVED" ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                      {req.status === "APPROVED" ? `✅ ${t("אושר", "Approved")}` : `❌ ${t("נדחה", "Rejected")}`}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#a0a0c0", marginBottom: 8 }}>{lang === "he" ? req.reason : req.reasonEn}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#8888aa" }}>
                  <span>📊 {req.campaign}</span>
                  <span style={{ color: "#10b981" }}>⚡ {lang === "he" ? req.expectedImpact : req.expectedImpactEn}</span>
                  <span>{t("ביטחון", "Confidence")}: {Math.round(req.confidence * 100)}%</span>
                  {req.autoApproveAt && <span style={{ color: "#f59e0b" }}>⏳ {t("אוטו-אישור ב-24 שעות", "Auto-approve in 24h")}</span>}
                </div>
              </div>
              {req.status === "PENDING" && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setExpanded(expanded === req.id ? null : req.id)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #3a3a5a", background: "transparent", color: "#8888aa", cursor: "pointer", fontSize: 12 }}>
                    👁️ {t("פרטים", "Details")}
                  </button>
                  <button onClick={() => reject(req.id)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #ef4444", background: "#ef444411", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    ❌ {t("דחה", "Reject")}
                  </button>
                  <button onClick={() => approve(req.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    ✅ {t("אשר", "Approve")}
                  </button>
                </div>
              )}
            </div>
            {expanded === req.id && (
              <div style={{ marginTop: 16, padding: 16, background: "#13132a", borderRadius: 8 }}>
                <pre style={{ fontSize: 12, color: "#a0a0c0", margin: 0, overflow: "auto" }}>{JSON.stringify(req.payload, null, 2)}</pre>
                <div style={{ marginTop: 12 }}>
                  <input value={notes[req.id] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))} placeholder={t("הוסף הערה (אופציונלי)...", "Add a note (optional)...")}
                    style={{ width: "100%", background: "#1a1a2e", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
