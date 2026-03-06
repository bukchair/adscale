"use client";
import { useState, useEffect } from "react";
import { useDashboard, getToday, getDaysAgo } from "@/hooks/useDashboard";

// ── Mini helpers ──────────────────────────────────────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const h = 40, w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const id = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data }: { data: { day: string; spent: number; revenue: number }[] }) {
  const maxR = Math.max(...data.map(d => d.revenue), 1);
  const maxS = Math.max(...data.map(d => d.spent), 1);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 110 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 90 }}>
            <div style={{ flex: 1, height: `${(d.revenue / maxR) * 100}%`, background: "linear-gradient(to top,#00d4aa,#00d4aa55)", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
            <div style={{ flex: 1, height: `${(d.spent / maxS) * 100}%`, background: "linear-gradient(to top,#7c74ff,#7c74ff55)", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
          </div>
          <span style={{ fontSize: 10, color: "#64748b" }}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function Skeleton({ w = "100%", h = 20, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

const platformColors: Record<string, string> = { google: "#4285F4", meta: "#1877F2", tiktok: "#ff0050" };
const statusColor: Record<string, string> = { active: "#00d4aa", paused: "#f5a623", draft: "#64748b" };
const statusLabel: Record<string, Record<string, string>> = {
  he: { active: "פעיל", paused: "מושהה", draft: "טיוטה" },
  en: { active: "Active", paused: "Paused", draft: "Draft" },
};

const DATE_PRESETS_HE = [
  { label: "7 ימים", from: () => getDaysAgo(7) },
  { label: "14 ימים", from: () => getDaysAgo(14) },
  { label: "30 ימים", from: () => getDaysAgo(30) },
];
const DATE_PRESETS_EN = [
  { label: "7 days", from: () => getDaysAgo(14) },
  { label: "14 days", from: () => getDaysAgo(14) },
  { label: "30 days", from: () => getDaysAgo(30) },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function GuestViewPage() {
  const [lang, setLang] = useState<"he" | "en">("he");
  const [preset, setPreset] = useState(0);
  const [animIn, setAnimIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "campaigns">("dashboard");

  const t = (he: string, en: string) => lang === "he" ? he : en;
  const dir = lang === "he" ? "rtl" : "ltr";
  const DATE_PRESETS = lang === "he" ? DATE_PRESETS_HE : DATE_PRESETS_EN;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setTimeout(() => setAnimIn(true), 80); }, []);

  const range = { from: DATE_PRESETS[preset].from(), to: getToday() };
  const { data, loading, refetch } = useDashboard(range.from, range.to);

  const summary = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };
  const timeSeries = data?.timeSeries ?? [];
  const byPlatform = data?.byPlatform ?? [];
  const isLive = data?.isLive ?? false;
  const lastUpdated = data?.lastUpdated ?? null;
  const campaigns = data?.campaigns ?? [];

  const s: Record<string, any> = {
    card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: isMobile ? 12 : 16, padding: isMobile ? 14 : 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
    statsGrid: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 14, marginBottom: 20 },
    grid2: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 10 : 14, marginBottom: 20 },
    th: { fontSize: 11, color: "#64748b", fontWeight: 500, textAlign: "right" as const, padding: "5px 12px 12px", borderBottom: "1px solid #e2e8f0" },
    td: { padding: "12px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" as const },
    badge: (st: string) => ({
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: statusColor[st] + "22", color: statusColor[st],
    }),
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", color: "#1e293b", fontFamily: "'Rubik','Heebo',sans-serif", direction: dir }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: isMobile ? "12px 16px" : "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: isMobile ? "auto" : 60, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, background: "linear-gradient(135deg,#7c74ff,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AdScale AI
          </div>
          {/* View-only badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0f4f8", border: "1px solid #e2e8f0", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
            <span>👁</span> {t("צפייה בלבד", "View Only")}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Live/demo indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: isLive ? "#00d4aa" : "#94a3b8" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: isLive ? "#00d4aa" : "#94a3b8", animation: isLive ? "pulse 2s infinite" : "none" }} />
            {isLive
              ? (lastUpdated ? `${t("עודכן", "Updated")} ${new Date(lastUpdated).toLocaleTimeString(lang === "he" ? "he-IL" : "en-US")}` : t("נתונים חיים", "Live"))
              : t("מצב דמו", "Demo")}
          </div>

          {/* Language */}
          <div style={{ display: "flex", background: "#f0f4f8", borderRadius: 8, padding: 2, gap: 2 }}>
            {(["he", "en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: lang === l ? "#fff" : "transparent", color: lang === l ? "#7c74ff" : "#94a3b8", boxShadow: lang === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                {l === "he" ? "עברית" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 36px", display: "flex", gap: 0 }}>
        {([
          { key: "dashboard", label: t("דשבורד", "Dashboard"), icon: "📊" },
          { key: "campaigns", label: t("קמפיינים", "Campaigns"), icon: "🚀" },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "14px 20px", border: "none", background: "transparent", cursor: "pointer",
            fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? "#1e293b" : "#94a3b8",
            borderBottom: activeTab === tab.key ? "2px solid #7c74ff" : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s",
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: isMobile ? "16px 14px 32px" : "32px 36px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Dashboard tab ── */}
        {activeTab === "dashboard" && (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isMobile ? 16 : 28, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700 }}>{t("סיכום ביצועים", "Performance Overview")}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  {loading ? t("טוען...", "Loading...") : isLive ? t("נתונים חיים", "Live data") : t("מצב דמו", "Demo mode")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", background: "#f0f4f8", borderRadius: 10, padding: 3, gap: 2 }}>
                  {DATE_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => setPreset(i)} style={{
                      padding: isMobile ? "5px 10px" : "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: isMobile ? 11 : 12, fontWeight: 600,
                      background: preset === i ? "#7c74ff" : "transparent",
                      color: preset === i ? "#fff" : "#64748b",
                    }}>{p.label}</button>
                  ))}
                </div>
                <button onClick={refetch} style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "#f0f4f8", color: "#475569" }}>↻</button>
              </div>
            </div>

            {/* Stats */}
            <div style={s.statsGrid}>
              {[
                { label: t("הוצאה כוללת", "Total Spend"), val: summary.totalSpent, prefix: "₪", color: "#7c74ff", data: timeSeries.map(d => d.spent) },
                { label: t("הכנסה", "Revenue"), val: summary.totalRevenue, prefix: "₪", color: "#00d4aa", data: timeSeries.map(d => d.revenue) },
                { label: t("ROAS ממוצע", "Avg ROAS"), val: summary.avgRoas, suffix: "x", color: "#f5a623", data: timeSeries.map(d => d.roas) },
                { label: t("המרות", "Conversions"), val: summary.totalConversions, color: "#4285F4", data: timeSeries.map(d => d.conversions) },
              ].map((m, i) => (
                <div key={i} style={{ ...s.card, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(18px)", transition: `all 0.45s ease ${i * 0.08}s` }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{m.label}</div>
                  {loading ? <Skeleton h={28} r={6} /> :
                    <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, letterSpacing: "-1px", color: "#1e293b" }}>
                      {m.prefix}{typeof m.val === "number" ? (m.label.includes("ROAS") || m.label.includes("Avg") ? m.val.toFixed(2) : Math.round(m.val).toLocaleString()) : m.val}{m.suffix}
                    </div>
                  }
                  <div style={{ marginTop: 10 }}>
                    {loading ? <Skeleton h={40} /> : <MiniChart data={m.data} color={m.color} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={s.grid2}>
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{t("הוצאה לפי יום", "Daily Spend")}</div>
                {loading ? <Skeleton h={110} /> : <BarChart data={timeSeries} />}
                <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#00d4aa" }} />{t("הכנסה", "Revenue")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#7c74ff" }} />{t("הוצאה", "Spend")}</div>
                </div>
              </div>

              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{t("לפי פלטפורמה", "By Platform")}</div>
                {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[0,1,2].map(i => <Skeleton key={i} h={44} r={8} />)}</div>
                ) : byPlatform.filter(p => p.spent > 0).map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < byPlatform.filter(x => x.spent > 0).length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: platformColors[p.platform] + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                      {p.platform === "google" ? "G" : p.platform === "meta" ? "M" : "T"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{p.platform === "google" ? "Google Ads" : p.platform === "meta" ? "Meta Ads" : "TikTok Ads"}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        ₪{Math.round(p.spent).toLocaleString()} {t("הוצאה", "spend")} · {p.clicks.toLocaleString()} {t("קליקים", "clicks")}
                      </div>
                    </div>
                    <div style={{ textAlign: "left" as const }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{p.roas > 0 ? p.roas.toFixed(2) + "x" : "—"}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>ROAS</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion funnel summary */}
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{t("סיכום ביצועים", "Performance Summary")}</div>
              {loading ? (
                <div style={{ display: "flex", gap: 10 }}>{[0,1,2,3].map(i => <Skeleton key={i} h={60} r={8} />)}</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12 }}>
                  {[
                    { label: t("סה״כ חשיפות", "Total Impressions"), val: byPlatform.reduce((s, p) => s + p.impressions, 0).toLocaleString(), icon: "👁" },
                    { label: t("סה״כ קליקים", "Total Clicks"), val: byPlatform.reduce((s, p) => s + p.clicks, 0).toLocaleString(), icon: "🖱" },
                    { label: t("CTR ממוצע", "Avg CTR"), val: (() => { const imp = byPlatform.reduce((s, p) => s + p.impressions, 0); const cl = byPlatform.reduce((s, p) => s + p.clicks, 0); return imp > 0 ? (cl / imp * 100).toFixed(2) + "%" : "—"; })(), icon: "📈" },
                    { label: t("עלות להמרה", "Cost/Conv."), val: summary.totalConversions > 0 ? "₪" + (summary.totalSpent / summary.totalConversions).toFixed(0) : "—", icon: "🎯" },
                  ].map((m, i) => (
                    <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                      <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: "#1e293b" }}>{m.val}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Campaigns tab ── */}
        {activeTab === "campaigns" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 16 : 28, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700 }}>{t("קמפיינים", "Campaigns")}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{campaigns.length} {t("קמפיינים", "campaigns")}</div>
              </div>
            </div>

            <div style={s.card}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[...Array(5)].map((_, i) => <Skeleton key={i} h={44} r={8} />)}
                </div>
              ) : campaigns.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>
                  {t("אין קמפיינים להצגה", "No campaigns to display")}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 560 : "unset" }}>
                    <thead>
                      <tr>
                        {[t("שם קמפיין", "Campaign"), t("פלטפורמה", "Platform"), t("סטטוס", "Status"), t("תקציב", "Budget"), t("הוצאה", "Spend"), "ROAS", t("המרות", "Conv.")].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id}>
                          <td style={s.td}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                          </td>
                          <td style={s.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: platformColors[c.platform] }} />
                              <span style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>{c.platform}</span>
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={s.badge(c.status)}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor[c.status] }} />
                              {statusLabel[lang][c.status]}
                            </span>
                          </td>
                          <td style={s.td}>₪{Math.round(c.budget).toLocaleString()}</td>
                          <td style={s.td}>₪{Math.round(c.spent).toLocaleString()}</td>
                          <td style={s.td}>
                            <span style={{ fontWeight: 600, color: c.roas >= 3 ? "#00d4aa" : c.roas >= 1.5 ? "#f5a623" : "#ef4444" }}>
                              {c.roas > 0 ? c.roas.toFixed(2) + "x" : "—"}
                            </span>
                          </td>
                          <td style={s.td}>{c.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", padding: "20px 0 32px", fontSize: 11, color: "#94a3b8" }}>
        {t("דף צפייה בלבד — לעריכה פנה למנהל החשבון", "Read-only view — contact account manager to make changes")}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: 0.82; }
        tr:hover td { background: #f8fafc; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}
