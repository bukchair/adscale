"use client";
/**
 * Approvals Queue Module
 * Displays pending approval requests with risk level, approve/reject actions.
 */
import { useState } from "react";
import { useApi, apiPost } from "@/hooks/useApi";

interface ApprovalReq {
  id:          string;
  riskLevel:   "LOW" | "MEDIUM" | "HIGH";
  title:       string;
  description: string;
  status:      string;
  createdAt:   string;
  expiresAt:   string | null;
  recommendation?: {
    type:           string;
    title:          string;
    expectedImpact: string | null;
    severity:       string;
  } | null;
}

const RISK_COLOR = {
  LOW:    "#00d4aa",
  MEDIUM: "#f5a623",
  HIGH:   "#ff4444",
};

export function ApprovalsQueue({ lang }: { lang: "he" | "en" }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  const { data, loading, error, refetch } = useApi<{ data: ApprovalReq[]; total: number }>(
    "/approvals",
    { status: "PENDING", limit: "20" }
  );

  async function approve(id: string) {
    setProcessing((p) => new Set(p).add(id));
    try {
      await apiPost(`/approvals/${id}/approve`, {});
      refetch();
    } finally {
      setProcessing((p) => { const s = new Set(p); s.delete(id); return s; });
    }
  }

  async function reject(id: string) {
    setProcessing((p) => new Set(p).add(id));
    try {
      await apiPost(`/approvals/${id}/reject`, { note: rejectNote[id] ?? "" });
      refetch();
    } finally {
      setProcessing((p) => { const s = new Set(p); s.delete(id); return s; });
    }
  }

  if (loading) return <QueueSkeleton />;
  if (error)   return <div style={{ color: "#ff4444", padding: 16 }}>{error}</div>;

  if (!data?.data.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{t("אין פעולות ממתינות לאישור", "No pending approvals")}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.data.map((req) => (
        <div
          key={req.id}
          style={{
            background:   "#fff",
            border:       `1px solid ${RISK_COLOR[req.riskLevel]}44`,
            borderLeft:   `4px solid ${RISK_COLOR[req.riskLevel]}`,
            borderRadius: 12,
            padding:      "16px 18px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
            <div style={{
              padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: RISK_COLOR[req.riskLevel] + "22",
              color:      RISK_COLOR[req.riskLevel],
              flexShrink: 0,
            }}>
              {req.riskLevel} {t("סיכון", "RISK")}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{req.title}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>{req.description}</div>
            </div>
          </div>

          {/* Expected impact */}
          {req.recommendation?.expectedImpact && (
            <div style={{
              background: "#f0f9ff",
              border:     "1px solid #bae6fd",
              borderRadius: 8,
              padding:    "8px 12px",
              fontSize:   12,
              color:      "#0369a1",
              marginBottom: 12,
            }}>
              {t("צפי לשיפור:", "Expected impact:")} {req.recommendation.expectedImpact}
            </div>
          )}

          {/* Expiry */}
          {req.expiresAt && (
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              {t("פג תוקף:", "Expires:")} {new Date(req.expiresAt).toLocaleString()}
            </div>
          )}

          {/* Reject note */}
          <textarea
            placeholder={t("הערה לדחייה (אופציונלי)", "Rejection note (optional)")}
            value={rejectNote[req.id] ?? ""}
            onChange={(e) => setRejectNote((p) => ({ ...p, [req.id]: e.target.value }))}
            rows={2}
            style={{
              width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "8px 12px", fontSize: 12,
              resize: "none", marginBottom: 10, boxSizing: "border-box",
            }}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => approve(req.id)}
              disabled={processing.has(req.id)}
              style={{
                flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#00d4aa,#009b7d)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                opacity: processing.has(req.id) ? 0.6 : 1,
              }}
            >
              ✓ {t("אשר", "Approve")}
            </button>
            <button
              onClick={() => reject(req.id)}
              disabled={processing.has(req.id)}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                border: "1px solid #ff444444", cursor: "pointer",
                background: "#fff", color: "#ff4444", fontSize: 13, fontWeight: 700,
              }}
            >
              ✕ {t("דחה", "Reject")}
            </button>
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
        {data.total} {t("בקשות ממתינות", "pending requests")}
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[1, 2].map((i) => (
        <div key={i} style={{
          height: 140, borderRadius: 12,
          background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
          backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
        }} />
      ))}
    </div>
  );
}
