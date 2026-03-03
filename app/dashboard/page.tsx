"use client";
// src/app/dashboard/page.tsx
// דשבורד מחובר לכל הפלטפורמות

import { useState, useEffect } from "react";
import { useDashboard, getToday, getDaysAgo, Campaign } from "@/hooks/useDashboard";

// ─────────────────────────────────────────────
// אייקונים
// ─────────────────────────────────────────────
const GoogleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const MetaIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#1877F2"/>
    <path d="M22 16c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 2.99 2.19 5.47 5.06 5.93V17.89h-1.52V16h1.52v-1.32c0-1.5.89-2.33 2.26-2.33.65 0 1.34.12 1.34.12v1.47h-.75c-.74 0-.97.46-.97.93V16h1.66l-.27 1.89h-1.39v4.04C19.81 21.47 22 18.99 22 16z" fill="white"/>
  </svg>
);
const TikTokIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#010101"/>
    <path d="M21.5 10.5c-.9-.6-1.6-1.5-1.9-2.5h-2.1v10.3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.2 0 .4 0 .6.1v-2.2c-.2 0-.4-.1-.6-.1-2.3 0-4.1 1.8-4.1 4.1s1.8 4.1 4.1 4.1 4.1-1.8 4.1-4.1v-5.4c.8.6 1.8.9 2.8.9V11.4c-.3 0-.6-.1-.9-.2v-.7z" fill="white"/>
  </svg>
);
const PlatformIcon = ({ platform, size = 16 }: { platform: string; size?: number }) => {
  if (platform === "google") return <GoogleIcon size={size} />;
  if (platform === "meta") return <MetaIcon size={size} />;
  return <TikTokIcon size={size} />;
};

// ─────────────────────────────────────────────
// גרפים
// ─────────────────────────────────────────────
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
          <span style={{ fontSize: 10, color: "#6b7280" }}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────
function Skeleton({ w = "100%", h = 20, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg, #181b2a 25%, #1f2235 50%, #181b2a 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ─────────────────────────────────────────────
// קבועים
// ─────────────────────────────────────────────
const platformColors: Record<string, string> = { google: "#4285F4", meta: "#1877F2", tiktok: "#ff0050" };
const platformLabels: Record<string, string> = { google: "Google Ads", meta: "Meta Ads", tiktok: "TikTok Ads" };
const statusColor: Record<string, string> = { active: "#00d4aa", paused: "#f5a623", draft: "#6b7280" };
const statusLabel: Record<string, string> = { active: "פעיל", paused: "מושהה", draft: "טיוטה" };

const TABS = [
  { label: "דשבורד", icon: "📊" },
  { label: "קמפיינים", icon: "🚀" },
  { label: "AI אופטימיזציה", icon: "🤖" },
  { label: "קהלים", icon: "👥" },
  { label: "הגדרות", icon: "⚙️" },
];

const AI_SUGGESTIONS = [
  { id: 1, platform: "google", impact: "+18% ROAS", message: "העלה תקציב לקמפיין המוביל ב-20% – ביקוש גבוה צפוי", priority: "high" },
  { id: 2, platform: "meta",   impact: "+12% CTR",  message: "הרחב קהל יעד ל-Lookalike 3% – קהל דומה לרוכשים הטובים שלך", priority: "medium" },
  { id: 3, platform: "tiktok", impact: "+25% CVR",  message: "החלף קריאייטיב ב-Retargeting – CTR ירד ב-40% בשבוע האחרון", priority: "high" },
  { id: 4, platform: "google", impact: "-8% CPA",   message: "עבור ל-Target CPA של ₪42 – AI זיהה דפוסי המרה חדשים", priority: "low" },
];

const DATE_PRESETS = [
  { label: "7 ימים", from: () => getDaysAgo(7) },
  { label: "14 ימים", from: () => getDaysAgo(14) },
  { label: "30 ימים", from: () => getDaysAgo(30) },
];

// ─────────────────────────────────────────────
// קומפוננטה ראשית
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  const [animIn, setAnimIn] = useState(false);
  const [preset, setPreset] = useState(0);
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);

  const range = { from: DATE_PRESETS[preset].from(), to: getToday() };
const { data, loading, refetch } = useDashboard(range.from, range.to);
  useEffect(() => { setTimeout(() => setAnimIn(true), 80); }, []);
  useEffect(() => { if (data.campaigns.length) setLocalCampaigns(data.campaigns); }, [data.campaigns]);

  const toggleCampaign = (id: string) => {
    setLocalCampaigns(prev => prev.map(c => c.id === id ? {
      ...c, status: c.status === "active" ? "paused" : c.status === "paused" ? "active" : c.status
    } as Campaign : c));
  };

  // ── סגנונות ──────────────────────────────────
  const s: Record<string, any> = {
    root: { minHeight: "100vh", background: "#090b12", color: "#e8eaf6", fontFamily: "'Rubik','Heebo',sans-serif", direction: "rtl", display: "flex" },
    sidebar: { width: 230, minHeight: "100vh", background: "#0c0e17", borderLeft: "1px solid #181b2a", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0 },
    main: { flex: 1, padding: "32px 36px", minWidth: 0, overflowY: "auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
    card: { background: "#0d0f18", border: "1px solid #181b2a", borderRadius: 16, padding: 22 },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 },
    btn: (v: string) => ({
      padding: v === "sm" ? "5px 12px" : "9px 20px", borderRadius: 10, border: "none",
      cursor: "pointer", fontSize: v === "sm" ? 11 : 13, fontWeight: 600,
      background: v === "primary" ? "linear-gradient(135deg,#7c74ff,#5e55e8)" : "#181b2a",
      color: "#fff", transition: "opacity 0.2s",
    }),
    th: { fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" as const, padding: "5px 12px 12px", borderBottom: "1px solid #181b2a" },
    td: { padding: "12px", borderBottom: "1px solid #181b2a08", fontSize: 13, verticalAlign: "middle" as const },
    badge: (st: string) => ({
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: statusColor[st] + "22", color: statusColor[st],
    }),
  };

const summary = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };
const timeSeries = data?.timeSeries ?? [];
const byPlatform = data?.byPlatform ?? [];
const isLive = data?.isLive ?? false;
const lastUpdated = data?.lastUpdated ?? null;
const apiErrors = data?.apiErrors ?? [];
  // ── render ────────────────────────────────────
  return (
    <div style={s.root}>
      {/* ── SIDEBAR ── */}
      <div style={s.sidebar}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #181b2a", marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#7c74ff,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AdScale AI
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>פרסום חכם לאיקומרס</div>
        </div>

        {TABS.map((t, i) => (
          <div key={i} onClick={() => setActiveTab(i)} style={{
            padding: "11px 20px", cursor: "pointer", fontSize: 14,
            fontWeight: activeTab === i ? 600 : 400,
            color: activeTab === i ? "#e8eaf6" : "#6b7280",
            background: activeTab === i ? "#7c74ff14" : "transparent",
            borderRight: activeTab === i ? "3px solid #7c74ff" : "3px solid transparent",
            display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
          }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </div>
        ))}

        {/* סטטוס חיבור */}
        <div style={{ margin: "auto 16px 16px", background: isLive ? "#00d4aa12" : "#7c74ff12", border: `1px solid ${isLive ? "#00d4aa33" : "#7c74ff33"}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isLive ? "#00d4aa" : "#7c74ff", marginBottom: 3 }}>
            {isLive ? "🟢 נתונים חיים" : "🔵 מצב דמו"}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>
            {isLive && lastUpdated
              ? `עודכן: ${new Date(lastUpdated).toLocaleTimeString("he-IL")}`
              : "חבר API Keys לנתונים אמיתיים"}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={s.main}>

        {/* שגיאות API חלקיות */}
        {Object.keys(apiErrors).length > 0 && isLive && (
          <div style={{ background: "#f5a62312", border: "1px solid #f5a62333", borderRadius: 12, padding: "12px 18px", marginBottom: 16, fontSize: 13 }}>
            ⚠️ חלק מהפלטפורמות לא נטענו: {Object.keys(apiErrors).join(", ")}
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 0 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>דשבורד ראשי</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {loading ? "טוען נתונים..." : isLive ? "נתונים חיים" : "מצב דמו – חבר API Keys"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* בורר תקופה */}
                <div style={{ display: "flex", background: "#181b2a", borderRadius: 10, padding: 3, gap: 2 }}>
                  {DATE_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => setPreset(i)} style={{
                      padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      background: preset === i ? "#7c74ff" : "transparent",
                      color: preset === i ? "#fff" : "#6b7280",
                    }}>{p.label}</button>
                  ))}
                </div>
                <button style={s.btn("default")} onClick={refetch} title="רענן">↻</button>
                <button style={s.btn("primary")} onClick={() => setActiveTab(1)}>+ קמפיין חדש</button>
              </div>
            </div>

            {/* כרטיסי סיכום */}
            <div style={s.statsGrid}>
              {[
                { label: "הוצאה כוללת", val: summary.totalSpent, prefix: "₪", data: timeSeries.map(d => d.spent) },
                { label: "הכנסה",        val: summary.totalRevenue, prefix: "₪", data: timeSeries.map(d => d.revenue) },
                { label: "ROAS ממוצע",  val: summary.avgRoas, suffix: "x", data: timeSeries.map(d => d.roas) },
                { label: "המרות",        val: summary.totalConversions, data: timeSeries.map(d => d.conversions) },
              ].map((m, i) => (
                <div key={i} style={{
                  ...s.card,
                  opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(18px)",
                  transition: `all 0.45s ease ${i * 0.08}s`,
                }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{m.label}</div>
                  {loading
                    ? <Skeleton h={32} r={6} />
                    : <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-1px" }}>
                        {m.prefix}{typeof m.val === "number"
                          ? m.label === "ROAS ממוצע" ? m.val.toFixed(2) : Math.round(m.val).toLocaleString()
                          : m.val}{m.suffix}
                      </div>
                  }
                  <div style={{ marginTop: 10 }}>
                    {loading ? <Skeleton h={40} /> : <MiniChart data={m.data} color="#00d4aa" />}
                  </div>
                </div>
              ))}
            </div>

            {/* גרף + המלצות */}
            <div style={s.grid2}>
              <div style={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: "flex", gap: 8 }}>
                  <span>📈</span> הוצאה vs. הכנסה
                </div>
                <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                  {[["#00d4aa","הכנסה"],["#7c74ff","הוצאה"]].map(([c,l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
                {loading ? <Skeleton h={110} /> : <BarChart data={timeSeries} />}
              </div>

              <div style={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🤖 המלצות AI דחופות</div>
                {AI_SUGGESTIONS.filter(sg => sg.priority === "high").map(sg => (
                  <div key={sg.id} style={{ background: "#12141a", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: "1px solid #7c74ff22", display: "flex", gap: 10 }}>
                    <PlatformIcon platform={sg.platform} size={20} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{sg.message}</div>
                      <div style={{ fontSize: 11, color: "#00d4aa", fontWeight: 700, marginTop: 3 }}>צפי: {sg.impact}</div>
                    </div>
                    <button style={s.btn("sm")} onClick={() => { setAppliedSuggestions(p => [...p, sg.id]); setActiveTab(2); }}>יישם</button>
                  </div>
                ))}
              </div>
            </div>

            {/* לפי פלטפורמה */}
            <div style={s.card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📊 ביצועים לפי פלטפורמה</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {(["google","meta","tiktok"] as const).map(p => {
                  const ps = byPlatform[p];
                  return (
                    <div key={p} style={{ background: "#12141a", borderRadius: 14, padding: "18px 20px", border: `1px solid ${platformColors[p]}22` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <PlatformIcon platform={p} size={22} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{platformLabels[p]}</span>
                      </div>
                      {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <Skeleton h={18} /><Skeleton h={18} w="70%" />
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {[
                            ["הוצאה", `₪${Math.round(ps.spent).toLocaleString()}`],
                            ["ROAS", `${ps.roas.toFixed(1)}x`],
                            ["קמפיינים", ps.activeCampaigns],
                            ["המרות", ps.conversions],
                          ].map(([l2, v2]) => (
                            <div key={l2 as string}>
                              <div style={{ fontSize: 10, color: "#6b7280" }}>{l2}</div>
                              <div style={{ fontSize: 16, fontWeight: 700 }}>{v2}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === 1 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>קמפיינים</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {localCampaigns.length} קמפיינים · {localCampaigns.filter(c => c.status === "active").length} פעילים
                </div>
              </div>
              <button style={s.btn("primary")}>+ קמפיין חדש</button>
            </div>
            <div style={s.card}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
                  {[...Array(5)].map((_, i) => <Skeleton key={i} h={44} r={8} />)}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["שם קמפיין","פלטפורמה","סטטוס","תקציב","הוצאה","ROAS","המרות","פעולות"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {localCampaigns.map((c, i) => (
                      <tr key={c.id} style={{ opacity: animIn ? 1 : 0, transition: `opacity 0.4s ease ${i * 0.06}s` }}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{c.clicks.toLocaleString()} קליקים</div>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <PlatformIcon platform={c.platform} size={16} />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{platformLabels[c.platform]}</span>
                          </div>
                        </td>
                        <td style={s.td}>
                          <span style={s.badge(c.status)}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor[c.status], display: "inline-block" }} />
                            {statusLabel[c.status]}
                          </span>
                        </td>
                        <td style={s.td}>₪{c.budget.toLocaleString()}</td>
                        <td style={s.td}>
                          <div>₪{Math.round(c.spent).toLocaleString()}</div>
                          <div style={{ height: 3, background: "#181b2a", borderRadius: 2, marginTop: 4, width: 60 }}>
                            <div style={{ height: "100%", width: `${c.budget ? Math.min((c.spent / c.budget) * 100, 100) : 0}%`, background: "#7c74ff", borderRadius: 2 }} />
                          </div>
                        </td>
                        <td style={s.td}>
                          <span style={{ color: c.roas > 4 ? "#00d4aa" : c.roas > 0 ? "#f5a623" : "#6b7280", fontWeight: 700 }}>
                            {c.roas > 0 ? `${c.roas.toFixed(1)}x` : "—"}
                          </span>
                        </td>
                        <td style={s.td}>{c.conversions || "—"}</td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={s.btn("sm")}>ערוך</button>
                            {c.status !== "draft" && (
                              <button style={{ ...s.btn("sm"), color: c.status === "active" ? "#f5a623" : "#00d4aa" }} onClick={() => toggleCampaign(c.id)}>
                                {c.status === "active" ? "השהה" : "הפעל"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── AI TAB ── */}
        {activeTab === 2 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>🤖 AI אופטימיזציה</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{AI_SUGGESTIONS.length - appliedSuggestions.length} המלצות ממתינות</div>
              </div>
              <div style={{ background: "linear-gradient(135deg,#7c74ff22,#00d4aa22)", border: "1px solid #7c74ff44", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#7c74ff" }}>
                פוטנציאל: +₪12,400 הכנסה נוספת
              </div>
            </div>

            {AI_SUGGESTIONS.map(sg => {
              const applied = appliedSuggestions.includes(sg.id);
              return (
                <div key={sg.id} style={{
                  background: applied ? "#00d4aa08" : "#0d0f18",
                  border: `1px solid ${applied ? "#00d4aa44" : sg.priority === "high" ? "#7c74ff33" : "#181b2a"}`,
                  borderRadius: 14, padding: "16px 20px", marginBottom: 12,
                  display: "flex", alignItems: "flex-start", gap: 14, transition: "all 0.3s",
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: platformColors[sg.platform] + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <PlatformIcon platform={sg.platform} size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{platformLabels[sg.platform]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: sg.priority === "high" ? "#7c74ff22" : "#f5a62322", color: sg.priority === "high" ? "#7c74ff" : "#f5a623" }}>{sg.impact}</span>
                      {sg.priority === "high" && <span style={{ fontSize: 11, color: "#ff6b6b", fontWeight: 600 }}>● דחוף</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "#b0b8d0", lineHeight: 1.6 }}>{sg.message}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {applied
                      ? <div style={{ color: "#00d4aa", fontSize: 13, fontWeight: 600 }}>✓ יושם</div>
                      : <div style={{ display: "flex", gap: 8 }}>
                          <button style={s.btn("default")}>דחה</button>
                          <button style={s.btn("primary")} onClick={() => setAppliedSuggestions(p => [...p, sg.id])}>יישם אוטומטית</button>
                        </div>
                    }
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── AUDIENCES TAB ── */}
        {activeTab === 3 && (
          <>
            <div style={s.header}>
              <div><div style={{ fontSize: 26, fontWeight: 700 }}>👥 קהלים</div><div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>קהלי יעד מבוססי WooCommerce</div></div>
              <button style={s.btn("primary")}>+ קהל חדש</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {[
                { name: "רוכשים אחרונים 30 יום", size: "1,248", platforms: ["google","meta"], c: "#7c74ff", icon: "🛒" },
                { name: "עזבו עגלה", size: "3,401", platforms: ["meta","tiktok"], c: "#f5a623", icon: "🛍️" },
                { name: "Lookalike רוכשים 3%", size: "82,000", platforms: ["meta"], c: "#00d4aa", icon: "🎯" },
                { name: "צפו במוצר 3+ פעמים", size: "2,190", platforms: ["google","meta","tiktok"], c: "#ff6b6b", icon: "👁️" },
                { name: "לקוחות VIP", size: "340", platforms: ["meta"], c: "#f5a623", icon: "⭐" },
                { name: "כל המבקרים", size: "24,700", platforms: ["google","meta"], c: "#7c74ff", icon: "🌐" },
              ].map((a, i) => (
                <div key={i} style={{ ...s.card, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(20px)", transition: `all 0.4s ease ${i * 0.08}s`, cursor: "pointer" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{a.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: a.c, marginBottom: 12 }}>{a.size}</div>
                  <div style={{ display: "flex", gap: 6 }}>{a.platforms.map(p => <PlatformIcon key={p} platform={p} size={18} />)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 4 && (
          <>
            <div style={s.header}>
              <div><div style={{ fontSize: 26, fontWeight: 700 }}>⚙️ הגדרות</div><div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>חיבורי API וניהול חשבון</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { name: "WooCommerce",          ok: !!process.env.NEXT_PUBLIC_WOO_CONNECTED,   icon: "🛒", key: "WOOCOMMERCE_URL",              detail: "חנות איקומרס" },
                { name: "Google Ads",           ok: !!process.env.NEXT_PUBLIC_GOOGLE_CONNECTED, icon: "🔵", key: "GOOGLE_ADS_CUSTOMER_ID",        detail: "חיפוש, Shopping, Display" },
                { name: "Meta Business",        ok: !!process.env.NEXT_PUBLIC_META_CONNECTED,   icon: "📘", key: "META_AD_ACCOUNT_ID",            detail: "Facebook + Instagram" },
                { name: "TikTok Ads",           ok: !!process.env.NEXT_PUBLIC_TIKTOK_CONNECTED, icon: "🎵", key: "TIKTOK_ADVERTISER_ID",          detail: "TikTok For Business" },
                { name: "Google Analytics 4",   ok: false,                                       icon: "📊", key: "GA4_PROPERTY_ID",               detail: "נתוני המרה" },
                { name: "Google Merchant Center",ok: false,                                      icon: "🛍️", key: "GMC_MERCHANT_ID",              detail: "פיד מוצרים" },
              ].map((c, i) => (
                <div key={i} style={{ ...s.card, display: "flex", alignItems: "center", gap: 16, opacity: animIn ? 1 : 0, transition: `opacity 0.4s ease ${i * 0.08}s` }}>
                  <div style={{ fontSize: 26 }}>{c.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{c.detail}</div>
                    {!c.ok && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontFamily: "monospace", background: "#181b2a", padding: "2px 6px", borderRadius: 4, display: "inline-block" }}>{c.key}</div>}
                  </div>
                  <div style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.ok ? "#00d4aa22" : "#ff6b6b22", color: c.ok ? "#00d4aa" : "#ff6b6b" }}>
                    {c.ok ? "מחובר" : "הגדר"}
                  </div>
                </div>
              ))}
            </div>

            {/* הוראות מהירות */}
            <div style={{ ...s.card, marginTop: 16, background: "#0a0c14" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#7c74ff" }}>⚡ התחל ב-3 צעדים</div>
              {[
                ["1", "צור פרויקט Next.js", "npx create-next-app@latest adscale --typescript --app"],
                ["2", "הגדר משתני סביבה", "cp .env.example .env.local && מלא את המפתחות"],
                ["3", "הפעל", "npm run dev → פתח localhost:3000/dashboard"],
              ].map(([n, t, c2]) => (
                <div key={n} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#7c74ff22", color: "#7c74ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{n}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{t}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", background: "#181b2a", padding: "4px 10px", borderRadius: 6 }}>{c2}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: 0.82; }
        tr:hover td { background: #ffffff03; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1a1d2e; border-radius: 2px; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
// update 
// update 
