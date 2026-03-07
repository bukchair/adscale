"use client";
/**
 * Audit Log Module
 * Full audit trail with filters, time range, user, and action type.
 */
import { useState } from "react";
import { useApi } from "@/hooks/useApi";

interface LogEntry {
  id:        string;
  action:    string;
  entity:    string;
  entityId:  string | null;
  before:    Record<string, unknown> | null;
  after:     Record<string, unknown> | null;
  createdAt: string;
  user?:     { email: string; name: string | null } | null;
}

export function AuditLog({ lang }: { lang: "he" | "en" }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().slice(0, 10);
  const from  = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const { data, loading } = useApi<{ data: LogEntry[]; total: number; pages: number }>(
    "/audit",
    { from, to: today, action: actionFilter || undefined, page, limit: 50 }
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <input
          type="text"
          placeholder={t("חפש לפי פעולה...", "Filter by action...")}
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
            fontSize: 13, background: "#f8fafc", outline: "none", flex: 1,
          }}
        />
      </div>

      {/* Log entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {loading
          ? Array(10).fill(0).map((_, i) => (
              <div key={i} style={{
                height: 44, borderRadius: 8,
                background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
              }} />
            ))
          : data?.data.map((entry) => (
              <div key={entry.id}>
                <div
                  onClick={() => toggleExpand(entry.id)}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          12,
                    padding:      "10px 14px",
                    borderRadius: 8,
                    background:   "#f8fafc",
                    border:       "1px solid #e2e8f0",
                    cursor:       "pointer",
                    userSelect:   "none",
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: entry.action.includes("failed") ? "#ff4444"
                      : entry.action.includes("approved") ? "#00d4aa"
                      : "#7c74ff",
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: "#1e293b" }}>
                      {entry.action}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
                      {entry.entity}{entry.entityId ? ` #${entry.entityId.slice(-8)}` : ""}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, textAlign: "right" }}>
                    {entry.user ? entry.user.email : t("מערכת", "system")}
                    <br />
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {expanded.has(entry.id) ? "▲" : "▼"}
                  </div>
                </div>

                {/* Expanded diff */}
                {expanded.has(entry.id) && (entry.before || entry.after) && (
                  <div style={{
                    background: "#f1f5f9", border: "1px solid #e2e8f0", borderTop: "none",
                    borderRadius: "0 0 8px 8px", padding: "12px 14px",
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
                  }}>
                    {entry.before && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#ff4444", marginBottom: 6 }}>
                          {t("לפני", "BEFORE")}
                        </div>
                        <pre style={{ margin: 0, fontSize: 11, color: "#475569", overflowX: "auto" }}>
                          {JSON.stringify(entry.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.after && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00d4aa", marginBottom: 6 }}>
                          {t("אחרי", "AFTER")}
                        </div>
                        <pre style={{ margin: 0, fontSize: 11, color: "#475569", overflowX: "auto" }}>
                          {JSON.stringify(entry.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
        }
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
          {Array.from({ length: Math.min(data.pages, 10) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
                background: page === i + 1 ? "#7c74ff" : "#fff",
                color:      page === i + 1 ? "#fff" : "#64748b",
                cursor: "pointer", fontSize: 12,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
