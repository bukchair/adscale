"use client";
import { useState } from "react";

const ACTION_ICONS: Record<string, string> = {
  APPROVAL_APPROVED: "✅", APPROVAL_REJECTED: "❌", SYNC_COMPLETED: "🔄",
  OPTIMIZATION_RUN_TRIGGERED: "🤖", USER_LOGIN: "👤", SYNC_FAILED: "⚠️",
  APPROVAL_REQUESTED: "⏳", APPROVAL_AUTO_APPROVED: "⚡",
};
const ACTION_COLORS: Record<string, string> = {
  APPROVAL_APPROVED: "#10b981", APPROVAL_REJECTED: "#ef4444", SYNC_COMPLETED: "#3b82f6",
  OPTIMIZATION_RUN_TRIGGERED: "#7c74ff", USER_LOGIN: "#8888aa", SYNC_FAILED: "#f97316",
  APPROVAL_REQUESTED: "#f59e0b", APPROVAL_AUTO_APPROVED: "#10b981",
};

const MOCK_LOGS = [
  { id: "1", action: "APPROVAL_APPROVED", entityType: "OptimizationAction", entityId: "act_001", user: { email: "admin@store.com", name: "ישראל ישראלי" }, metadata: { campaign: "Shopping - Best Sellers", change: "budget +₪100" }, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "2", action: "OPTIMIZATION_RUN_TRIGGERED", entityType: "Organization", entityId: "org_001", user: { email: "admin@store.com", name: "ישראל ישראלי" }, metadata: { mode: "SUGGESTION", decisionsGenerated: 12 }, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "3", action: "SYNC_COMPLETED", entityType: "SyncJob", entityId: "sync_001", user: null, metadata: { type: "search_terms", recordsProcessed: 847 }, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "4", action: "APPROVAL_REJECTED", entityType: "OptimizationAction", entityId: "act_002", user: { email: "admin@store.com", name: "ישראל ישראלי" }, metadata: { campaign: "Google - Competitors", reason: "נדרשת בדיקה נוספת" }, createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: "5", action: "SYNC_FAILED", entityType: "SyncJob", entityId: "sync_002", user: null, metadata: { type: "metrics", error: "Rate limit exceeded" }, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: "6", action: "USER_LOGIN", entityType: "User", entityId: "usr_001", user: { email: "admin@store.com", name: "ישראל ישראלי" }, metadata: { ip: "185.x.x.x" }, createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: "7", action: "APPROVAL_AUTO_APPROVED", entityType: "ApprovalRequest", entityId: "req_003", user: null, metadata: { campaign: "Shopping - All Products", rule: "auto", severity: "low" }, createdAt: new Date(Date.now() - 21600000).toISOString() },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `לפני ${h} שעות`;
  return `לפני ${m} דקות`;
}

export default function AuditLogModule() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = MOCK_LOGS
    .filter((l) => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.user?.email?.includes(search))
    .filter((l) => actionFilter === "all" || l.action === actionFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש פעולה, משתמש..."
          style={{ flex: 1, background: "#1a1a2e", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "8px 14px", fontSize: 13, outline: "none" }}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ background: "#1a1a2e", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}
        >
          <option value="all">כל הפעולות</option>
          <option value="APPROVAL_APPROVED">אישורים</option>
          <option value="SYNC_COMPLETED">סנכרון</option>
          <option value="OPTIMIZATION_RUN_TRIGGERED">אופטימיזציה</option>
        </select>
        <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #3a3a5a", background: "#1a1a2e", color: "#8888aa", cursor: "pointer", fontSize: 13 }}>
          📥 ייצוא CSV
        </button>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((log) => (
          <div
            key={log.id}
            style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, padding: "14px 18px", cursor: "pointer" }}
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
                background: `${ACTION_COLORS[log.action] || "#8888aa"}22`,
              }}>
                {ACTION_ICONS[log.action] || "📋"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ACTION_COLORS[log.action] || "#e0e0ff" }}>{log.action}</span>
                  {log.entityType && (
                    <span style={{ fontSize: 11, color: "#8888aa", background: "#2a2a4a", padding: "1px 8px", borderRadius: 6 }}>
                      {log.entityType}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#8888aa" }}>
                  {log.user ? `👤 ${log.user.name} (${log.user.email})` : "⚡ מערכת אוטומטית"}
                  {" · "}{timeAgo(log.createdAt)}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#8888aa" }}>{expanded === log.id ? "▲" : "▼"}</span>
            </div>

            {expanded === log.id && (
              <div style={{ marginTop: 12, padding: 12, background: "#13132a", borderRadius: 8 }}>
                <pre style={{ fontSize: 12, color: "#a0a0c0", margin: 0 }}>
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
