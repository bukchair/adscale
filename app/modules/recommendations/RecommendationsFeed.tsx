"use client";
/**
 * Recommendations Feed Module
 * Shows AI-generated recommendations sorted by severity.
 * Supports execute / dismiss actions with approval routing.
 */
import { useState } from "react";
import { useApi, apiPost } from "@/hooks/useApi";

interface Rec {
  id:             string;
  type:           string;
  title:          string;
  reason:         string;
  confidence:     number;
  severity:       "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  expectedImpact: string | null;
  status:         string;
  createdAt:      string;
  campaign?:      { name: string; status: string } | null;
  approvalRequest?: { status: string; riskLevel: string } | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#ff4444",
  HIGH:     "#f5a623",
  MEDIUM:   "#7c74ff",
  LOW:      "#00d4aa",
};

const TYPE_ICON: Record<string, string> = {
  RAISE_BUDGET:          "📈",
  LOWER_BUDGET:          "📉",
  PAUSE_CAMPAIGN:        "⏸",
  ADD_NEGATIVE_KEYWORD:  "🚫",
  SUGGEST_CREATIVE:      "🎨",
  FLAG_ISSUE:            "⚠️",
  PAUSE_KEYWORD:         "🔇",
  PROMOTE_PRODUCT:       "⭐",
};

export function RecommendationsFeed({
  lang,
  from,
  to,
}: {
  lang: "he" | "en";
  from: string;
  to:   string;
}) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [executing, setExecuting] = useState<Set<string>>(new Set());

  const { data, loading, error, refetch } = useApi<{ data: Rec[]; total: number }>(
    "/recommendations",
    { status: "PENDING", limit: "20" }
  );

  async function execute(id: string) {
    setExecuting((prev) => new Set(prev).add(id));
    try {
      const r = await apiPost<{ result: string }>(`/recommendations/${id}/execute`, {});
      alert(`${t("תוצאה", "Result")}: ${r.result}`);
      refetch();
    } catch (err: any) {
      alert(t("שגיאה: ", "Error: ") + err.message);
    } finally {
      setExecuting((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function dismiss(id: string) {
    await apiPost(`/recommendations/${id}/dismiss`, {});
    refetch();
  }

  if (loading) return <FeedSkeleton />;
  if (error)   return <div style={{ color: "#ff4444", padding: 16 }}>{error}</div>;
  if (!data?.data.length) return <EmptyFeed t={t} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.data.map((rec) => (
        <div
          key={rec.id}
          style={{
            background: "#fff",
            border:     `1px solid ${SEVERITY_COLOR[rec.severity]}33`,
            borderLeft: `4px solid ${SEVERITY_COLOR[rec.severity]}`,
            borderRadius: 12,
            padding:    "14px 16px",
            display:    "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          {/* Icon */}
          <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>
            {TYPE_ICON[rec.type] ?? "💡"}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{rec.title}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8,
                background: SEVERITY_COLOR[rec.severity] + "22",
                color:      SEVERITY_COLOR[rec.severity],
              }}>
                {rec.severity}
              </span>
              <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: "auto" }}>
                {Math.round(rec.confidence * 100)}% {t("ביטחון", "confidence")}
              </span>
            </div>

            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, lineHeight: 1.5 }}>
              {rec.reason}
            </div>

            {rec.expectedImpact && (
              <div style={{ fontSize: 11, color: "#00d4aa", fontWeight: 600, marginBottom: 8 }}>
                {t("צפי:", "Expected:")} {rec.expectedImpact}
              </div>
            )}

            {rec.campaign && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {t("קמפיין:", "Campaign:")} {rec.campaign.name}
              </div>
            )}

            {rec.approvalRequest && (
              <div style={{
                fontSize: 11, fontWeight: 600, marginTop: 6,
                color: rec.approvalRequest.status === "PENDING" ? "#f5a623" : "#00d4aa",
              }}>
                🔐 {t("ממתין לאישור", "Pending approval")} ({rec.approvalRequest.riskLevel})
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => execute(rec.id)}
              disabled={executing.has(rec.id)}
              style={{
                padding:    "6px 14px",
                borderRadius: 8,
                border:     "none",
                cursor:     "pointer",
                fontSize:   12,
                fontWeight: 600,
                background: "linear-gradient(135deg,#7c74ff,#5e55e8)",
                color:      "#fff",
                opacity:    executing.has(rec.id) ? 0.6 : 1,
              }}
            >
              {executing.has(rec.id) ? "..." : t("בצע", "Execute")}
            </button>
            <button
              onClick={() => dismiss(rec.id)}
              style={{
                padding:    "6px 14px",
                borderRadius: 8,
                border:     "1px solid #e2e8f0",
                cursor:     "pointer",
                fontSize:   12,
                color:      "#64748b",
                background: "transparent",
              }}
            >
              {t("בטל", "Dismiss")}
            </button>
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
        {data.total} {t("המלצות סה״כ", "total recommendations")}
      </div>
    </div>
  );
}

function EmptyFeed({ t }: { t: (he: string, en: string) => string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>
        {t("אין המלצות ממתינות", "No pending recommendations")}
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        {t("הכל נראה תקין!", "Everything looks good!")}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
          borderRadius: 12,
          height: 90,
        }} />
      ))}
    </div>
  );
}
