"use client";
import { useState, useEffect } from "react";
import { useDashboard, getToday, getDaysAgo, Campaign } from "@/hooks/useDashboard";

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

const platformColors: Record<string, string> = { google: "#4285F4", meta: "#1877F2", tiktok: "#ff0050" };
const platformLabels: Record<string, string> = { google: "Google Ads", meta: "Meta Ads", tiktok: "TikTok Ads" };
const statusColor: Record<string, string> = { active: "#00d4aa", paused: "#f5a623", draft: "#6b7280" };
const statusLabel: Record<string, string> = { active: "פעיל", paused: "מושהה", draft: "טיוטה" };

const TABS = [
  { label: "דשבורד", icon: "📊" },
  { label: "קמפיינים", icon: "🚀" },
  { label: "AI אופטימיזציה", icon: "🤖" },
  { label: "קהלים", icon: "👥" },
  { label: "מילות שליליות", icon: "🚫" },
  { label: "מרצ'נט", icon: "🛍️" },
  { label: "הגדרות", icon: "⚙️" },
];

const PRIORITY_COLORS: Record<string, string> = { high: "#ff6b6b", medium: "#f5a623", low: "#7c74ff" };
const PRIORITY_LABELS: Record<string, string> = { high: "דחוף", medium: "בינוני", low: "נמוך" };
const CATEGORY_LABELS: Record<string, string> = { budget: "תקציב", creative: "קריאייטיב", bidding: "הצעות מחיר", audience: "קהל", structure: "מבנה" };

const DATE_PRESETS = [
  { label: "7 ימים", from: () => getDaysAgo(7) },
  { label: "14 ימים", from: () => getDaysAgo(14) },
  { label: "30 ימים", from: () => getDaysAgo(30) },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [animIn, setAnimIn] = useState(false);
  const [preset, setPreset] = useState(0);
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);

  // Settings status state
  const [settingsStatus, setSettingsStatus] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState<Set<string>>(new Set());
  const [aiErrors, setAiErrors] = useState<string[]>([]);

  // Audiences tab state
  const [audiencesData, setAudiencesData] = useState<any>(null);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", type: "website", retentionDays: 30, sourceAudienceId: "", ratio: 0.01 });
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{ id: string; name: string } | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<"all" | "meta" | "google">("all");

  // Merchant Center tab state
  const [merchantData, setMerchantData] = useState<any>(null);
  const [merchantLoading, setMerchantLoading] = useState(false);

  // Negative keywords tab state
  const [negTerms, setNegTerms] = useState<any[]>([]);
  const [negLoading, setNegLoading] = useState(false);
  const [negSelected, setNegSelected] = useState<Set<string>>(new Set());
  const [negApplying, setNegApplying] = useState(false);
  const [negResult, setNegResult] = useState<{ listName: string; added: number; campaignsLinked: number } | null>(null);
  const [negApiErrors, setNegApiErrors] = useState<string[]>([]);
  const [negExistingList, setNegExistingList] = useState<{ id: string; name: string } | null>(null);
  const [negMatchType, setNegMatchType] = useState<"BROAD" | "PHRASE" | "EXACT">("BROAD");

  const range = { from: DATE_PRESETS[preset].from(), to: getToday() };
  const { data, loading, refetch } = useDashboard(range.from, range.to);

  useEffect(() => { setTimeout(() => setAnimIn(true), 80); }, []);
  useEffect(() => { if (data.campaigns.length) setLocalCampaigns(data.campaigns); }, [data.campaigns]);

  async function loadNegTerms() {
    setNegLoading(true);
    setNegResult(null);
    try {
      const res = await fetch(`/api/negative-keywords?from=${range.from}&to=${range.to}`);
      const d = await res.json();
      setNegTerms(d.terms || []);
      setNegExistingList(d.existingList || null);
      setNegApiErrors(d.errors || []);
      setNegSelected(new Set());
    } finally {
      setNegLoading(false);
    }
  }

  useEffect(() => { if (activeTab === 3) loadAudiences(); }, [activeTab]);
  useEffect(() => { if (activeTab === 4) loadNegTerms(); }, [activeTab]);

  async function loadAudiences() {
    setAudiencesLoading(true);
    try {
      const res = await fetch("/api/audiences");
      const d = await res.json();
      setAudiencesData(d);
    } finally {
      setAudiencesLoading(false);
    }
  }

  async function createAudience() {
    if (!createForm.name.trim()) return;
    setCreateLoading(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/audiences/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const d = await res.json();
      if (d.success) {
        setCreateResult({ id: d.id, name: d.name });
        setShowCreateForm(false);
        setCreateForm({ name: "", type: "website", retentionDays: 30, sourceAudienceId: "", ratio: 0.01 });
        await loadAudiences();
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function loadAiSuggestions() {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/ai-suggestions?from=${range.from}&to=${range.to}`);
      const d = await res.json();
      setAiSuggestions(d.suggestions || []);
      setAiErrors(d.errors || []);
    } finally {
      setAiLoading(false);
    }
  }
  useEffect(() => { if (activeTab === 2) loadAiSuggestions(); }, [activeTab]);

  async function loadSettingsStatus() {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings/status");
      const d = await res.json();
      setSettingsStatus(d);
    } finally {
      setSettingsLoading(false);
    }
  }
  useEffect(() => { if (activeTab === 6) loadSettingsStatus(); }, [activeTab]);

  async function loadMerchantData() {
    setMerchantLoading(true);
    try {
      const res = await fetch(`/api/merchant?from=${range.from}&to=${range.to}`);
      const d = await res.json();
      setMerchantData(d);
    } finally {
      setMerchantLoading(false);
    }
  }
  useEffect(() => { if (activeTab === 5) loadMerchantData(); }, [activeTab]);

  async function applyNegKeywords() {
    if (!negSelected.size) return;
    setNegApplying(true);
    try {
      const res = await fetch("/api/negative-keywords/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: Array.from(negSelected), matchType: negMatchType }),
      });
      const d = await res.json();
      if (d.success) {
        setNegResult({ listName: d.listName, added: d.added, campaignsLinked: d.campaignsLinked });
        await loadNegTerms();
      }
    } finally {
      setNegApplying(false);
    }
  }

  function toggleNegTerm(term: string) {
    setNegSelected(prev => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });
  }

  function selectAllNeg() {
    setNegSelected(negTerms.length === negSelected.size ? new Set() : new Set(negTerms.map(t => t.term)));
  }

  const toggleCampaign = (id: string) => {
    setLocalCampaigns(prev => prev.map(c => c.id === id ? {
      ...c, status: c.status === "active" ? "paused" : c.status === "paused" ? "active" : c.status
    } as Campaign : c));
  };

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

  return (
    <div style={s.root}>
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
        <div style={{ margin: "auto 16px 16px", background: isLive ? "#00d4aa12" : "#7c74ff12", border: `1px solid ${isLive ? "#00d4aa33" : "#7c74ff33"}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isLive ? "#00d4aa" : "#7c74ff", marginBottom: 3 }}>
            {isLive ? "נתונים חיים" : "מצב דמו"}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>
            {isLive && lastUpdated ? `עודכן: ${new Date(lastUpdated).toLocaleTimeString("he-IL")}` : "חבר API Keys לנתונים אמיתיים"}
          </div>
        </div>
      </div>

      <div style={s.main}>
        {apiErrors.length > 0 && isLive && (
          <div style={{ background: "#f5a62312", border: "1px solid #f5a62333", borderRadius: 12, padding: "12px 18px", marginBottom: 16, fontSize: 13 }}>
            חלק מהפלטפורמות לא נטענו
          </div>
        )}

        {activeTab === 0 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>דשבורד ראשי</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {loading ? "טוען נתונים..." : isLive ? "נתונים חיים" : "מצב דמו"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                <button style={s.btn("default")} onClick={refetch}>↻</button>
                <button style={s.btn("primary")} onClick={() => setActiveTab(1)}>+ קמפיין חדש</button>
              </div>
            </div>

            <div style={s.statsGrid}>
              {[
                { label: "הוצאה כוללת", val: summary.totalSpent, prefix: "₪", data: timeSeries.map(d => d.spent) },
                { label: "הכנסה", val: summary.totalRevenue, prefix: "₪", data: timeSeries.map(d => d.revenue) },
                { label: "ROAS ממוצע", val: summary.avgRoas, suffix: "x", data: timeSeries.map(d => d.roas) },
                { label: "המרות", val: summary.totalConversions, data: timeSeries.map(d => d.conversions) },
              ].map((m, i) => (
                <div key={i} style={{ ...s.card, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(18px)", transition: `all 0.45s ease ${i * 0.08}s` }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{m.label}</div>
                  {loading ? <Skeleton h={32} r={6} /> :
                    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-1px" }}>
                      {m.prefix}{typeof m.val === "number" ? (m.label === "ROAS ממוצע" ? m.val.toFixed(2) : Math.round(m.val).toLocaleString()) : m.val}{m.suffix}
                    </div>
                  }
                  <div style={{ marginTop: 10 }}>
                    {loading ? <Skeleton h={40} /> : <MiniChart data={m.data} color="#00d4aa" />}
                  </div>
                </div>
              ))}
            </div>

            <div style={s.grid2}>
              <div style={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>הוצאה vs. הכנסה</div>
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
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>המלצות AI דחופות</div>
                {aiSuggestions.filter(sg => sg.priority === "high" && !aiApplied.has(sg.id)).slice(0, 3).map(sg => (
                  <div key={sg.id} style={{ background: "#12141a", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: "1px solid #ff6b6b22", display: "flex", gap: 10 }}>
                    <PlatformIcon platform={sg.platform} size={20} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{sg.message}</div>
                      <div style={{ fontSize: 11, color: "#00d4aa", fontWeight: 700, marginTop: 3 }}>צפי: {sg.impact}</div>
                    </div>
                    <button style={s.btn("sm")} onClick={() => { setAiApplied(prev => new Set([...prev, sg.id])); setActiveTab(2); }}>יישם</button>
                  </div>
                ))}
                {aiSuggestions.filter(sg => sg.priority === "high").length === 0 && !aiLoading && (
                  <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center", padding: "16px 0" }}>
                    {aiLoading ? "טוען..." : "אין המלצות דחופות כרגע"}
                  </div>
                )}
              </div>
            </div>

            <div style={s.card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>ביצועים לפי פלטפורמה</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {(["google","meta","tiktok"] as const).map(p => {
                  const ps = byPlatform.find((x: { platform: string }) => x.platform === p);
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
                          {([
                            ["הוצאה", `${Math.round(ps?.spent ?? 0).toLocaleString()}`],
                            ["ROAS", `${(ps?.roas ?? 0).toFixed(1)}x`],
                            ["קליקים", `${(ps?.clicks ?? 0).toLocaleString()}`],
                            ["המרות", `${ps?.conversions ?? 0}`],
                          ] as [string, string][]).map(([l2, v2]) => (
                            <div key={l2}>
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

        {activeTab === 1 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>קמפיינים</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {localCampaigns.length} קמפיינים
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
                        <td style={s.td}><div style={{ fontWeight: 600 }}>{c.name}</div></td>
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
                        <td style={s.td}>{c.budget.toLocaleString()}</td>
                        <td style={s.td}>{Math.round(c.spent).toLocaleString()}</td>
                        <td style={s.td}>
                          <span style={{ color: c.roas > 4 ? "#00d4aa" : "#f5a623", fontWeight: 700 }}>
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

        {activeTab === 2 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>AI אופטימיזציה</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {aiLoading ? "מנתח קמפיינים..." : `${aiSuggestions.filter(s => !aiApplied.has(s.id)).length} המלצות פעילות`}
                </div>
              </div>
              <button style={s.btn("sm")} onClick={loadAiSuggestions} disabled={aiLoading}>
                {aiLoading ? "טוען..." : "נתח מחדש"}
              </button>
            </div>

            {aiErrors.length > 0 && (
              <div style={{ background: "#f5a62310", border: "1px solid #f5a62333", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#f5a623" }}>
                {aiErrors.join(" | ")}
              </div>
            )}

            {aiLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3,4].map(i => <Skeleton key={i} h={88} r={14} />)}
              </div>
            )}

            {!aiLoading && aiSuggestions.length === 0 && (
              <div style={{ ...s.card, textAlign: "center", padding: "48px 0", color: "#6b7280" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>אין המלצות כרגע</div>
                <div style={{ fontSize: 13 }}>כל הקמפיינים מבצעים בצורה טובה, או שהנתונים עדיין בטעינה</div>
              </div>
            )}

            {!aiLoading && aiSuggestions.map(sg => {
              const applied = aiApplied.has(sg.id);
              const prioColor = PRIORITY_COLORS[sg.priority] || "#7c74ff";
              return (
                <div key={sg.id} style={{
                  background: applied ? "#00d4aa08" : "#0d0f18",
                  border: `1px solid ${applied ? "#00d4aa44" : prioColor + "28"}`,
                  borderRadius: 14, padding: "16px 20px", marginBottom: 12,
                  display: "flex", alignItems: "flex-start", gap: 14,
                  opacity: applied ? 0.6 : 1,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: platformColors[sg.platform] + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                    <PlatformIcon platform={sg.platform} size={24} />
                    <div style={{ position: "absolute", top: -4, right: -4, width: 10, height: 10, borderRadius: "50%", background: prioColor, border: "2px solid #090b12" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>{platformLabels[sg.platform]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: prioColor + "22", color: prioColor }}>
                        {PRIORITY_LABELS[sg.priority]}
                      </span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#181b2a", color: "#6b7280" }}>
                        {CATEGORY_LABELS[sg.category]}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#00d4aa", marginRight: "auto" }}>{sg.impact}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{sg.message}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", background: "#12141a", padding: "4px 8px", borderRadius: 6, display: "inline-block" }}>{sg.detail}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {applied
                      ? <div style={{ color: "#00d4aa", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>✓ יושם</div>
                      : <button style={s.btn("primary")} onClick={() => setAiApplied(prev => new Set([...prev, sg.id]))}>יישם</button>
                    }
                  </div>
                </div>
              );
            })}
          </>
        )}

        {activeTab === 3 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>קהלים</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {audiencesLoading ? "טוען..." : audiencesData ? `${audiencesData.total} קהלים` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ display: "flex", background: "#181b2a", borderRadius: 10, padding: 3, gap: 2 }}>
                  {(["all","meta","google"] as const).map(f => (
                    <button key={f} onClick={() => setAudienceFilter(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: audienceFilter === f ? "#7c74ff" : "transparent", color: audienceFilter === f ? "#fff" : "#6b7280" }}>
                      {f === "all" ? "הכל" : f === "meta" ? "Meta" : "Google"}
                    </button>
                  ))}
                </div>
                <button style={s.btn("sm")} onClick={loadAudiences} disabled={audiencesLoading}>{audiencesLoading ? "טוען..." : "רענן"}</button>
                <button style={s.btn("primary")} onClick={() => { setShowCreateForm(true); setCreateResult(null); }}>+ קהל חדש</button>
              </div>
            </div>

            {createResult && (
              <div style={{ background: "#00d4aa12", border: "1px solid #00d4aa44", borderRadius: 12, padding: "12px 20px", marginBottom: 16, fontSize: 13 }}>
                <span style={{ color: "#00d4aa", fontWeight: 700 }}>✓ קהל נוצר!</span> "{createResult.name}" (ID: {createResult.id})
              </div>
            )}

            {showCreateForm && (
              <div style={{ ...s.card, marginBottom: 20, border: "1px solid #7c74ff44" }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>יצירת קהל חדש ב-Meta</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>שם הקהל</div>
                    <input
                      value={createForm.name}
                      onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="לדוגמה: מבקרי אתר 30 יום"
                      style={{ width: "100%", background: "#181b2a", color: "#e8eaf6", border: "1px solid #2a2d3e", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>סוג קהל</div>
                    <select
                      value={createForm.type}
                      onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))}
                      style={{ width: "100%", background: "#181b2a", color: "#e8eaf6", border: "1px solid #2a2d3e", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                    >
                      <option value="website">מבקרי אתר (Pixel)</option>
                      <option value="engagement">מעורבות</option>
                      <option value="lookalike">לוקאלייק</option>
                    </select>
                  </div>
                  {createForm.type !== "lookalike" && (
                    <div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>תקופת שמירה (ימים)</div>
                      <select
                        value={createForm.retentionDays}
                        onChange={e => setCreateForm(p => ({ ...p, retentionDays: parseInt(e.target.value) }))}
                        style={{ width: "100%", background: "#181b2a", color: "#e8eaf6", border: "1px solid #2a2d3e", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                      >
                        {[7, 14, 30, 60, 90, 180].map(d => <option key={d} value={d}>{d} יום</option>)}
                      </select>
                    </div>
                  )}
                  {createForm.type === "lookalike" && (
                    <>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>ID קהל מקור</div>
                        <input
                          value={createForm.sourceAudienceId}
                          onChange={e => setCreateForm(p => ({ ...p, sourceAudienceId: e.target.value }))}
                          placeholder="הדבק ID של קהל קיים"
                          style={{ width: "100%", background: "#181b2a", color: "#e8eaf6", border: "1px solid #2a2d3e", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>אחוז לוקאלייק</div>
                        <select
                          value={createForm.ratio}
                          onChange={e => setCreateForm(p => ({ ...p, ratio: parseFloat(e.target.value) }))}
                          style={{ width: "100%", background: "#181b2a", color: "#e8eaf6", border: "1px solid #2a2d3e", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                        >
                          <option value={0.01}>1%</option>
                          <option value={0.02}>2%</option>
                          <option value={0.03}>3%</option>
                          <option value={0.05}>5%</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...s.btn("primary"), opacity: createLoading ? 0.5 : 1 }} onClick={createAudience} disabled={createLoading}>
                    {createLoading ? "יוצר..." : "צור קהל"}
                  </button>
                  <button style={s.btn("default")} onClick={() => setShowCreateForm(false)}>ביטול</button>
                </div>
              </div>
            )}

            {audiencesLoading && !audiencesData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} h={120} r={16} />)}
              </div>
            )}

            {audiencesData?.errors?.length > 0 && (
              <div style={{ background: "#f5a62310", border: "1px solid #f5a62333", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#f5a623" }}>
                {audiencesData.errors.join(" | ")}
              </div>
            )}

            {audiencesData && (() => {
              const allAudiences = [
                ...(audiencesData.meta || []),
                ...(audiencesData.google || []),
              ].filter(a => audienceFilter === "all" || a.platform === audienceFilter)
               .sort((a: any, b: any) => (b.sizeRaw || 0) - (a.sizeRaw || 0));

              const subtypeIcon: Record<string, string> = {
                WEBSITE: "🌐", LOOKALIKE: "🎯", CUSTOM: "📋", APP: "📱", VIDEO: "🎬",
                ENGAGEMENT: "❤️", REMARKETING: "🔄", CRM_BASED: "👥", SIMILAR_USERS: "✨",
              };

              if (!allAudiences.length) {
                return (
                  <div style={{ ...s.card, textAlign: "center" as const, padding: "48px 0", color: "#6b7280" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>אין קהלים {audienceFilter !== "all" ? `ב-${audienceFilter}` : ""}</div>
                    <div style={{ fontSize: 13 }}>בדוק שה-API Keys מוגדרים נכון בהגדרות</div>
                  </div>
                );
              }

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  {allAudiences.map((a: any, i: number) => {
                    const platColor = a.platform === "meta" ? "#1877F2" : "#4285F4";
                    return (
                      <div key={a.id || i} style={{ ...s.card, cursor: "default", border: `1px solid ${platColor}22`, opacity: animIn ? 1 : 0, transition: `opacity 0.35s ease ${Math.min(i, 8) * 0.06}s` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <span style={{ fontSize: 22 }}>{subtypeIcon[a.subtype] || "👥"}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <PlatformIcon platform={a.platform} size={16} />
                            {a.hasLookalike && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "#00d4aa22", color: "#00d4aa" }}>LAL</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{a.name}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: platColor, marginBottom: 6 }}>{a.size}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                          <span style={{ background: "#181b2a", padding: "1px 7px", borderRadius: 8 }}>{a.type}</span>
                          {a.retentionDays && <span style={{ background: "#181b2a", padding: "1px 7px", borderRadius: 8 }}>{a.retentionDays}י'</span>}
                        </div>
                        {a.subtype !== "LOOKALIKE" && a.platform === "meta" && (
                          <button
                            style={{ ...s.btn("sm"), marginTop: 10, fontSize: 10, padding: "3px 8px" }}
                            onClick={() => { setCreateForm(p => ({ ...p, type: "lookalike", sourceAudienceId: a.id, name: `LAL ${a.name} 1%` })); setShowCreateForm(true); }}
                          >
                            + צור LAL
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {!audiencesData && !audiencesLoading && (
              <div style={{ ...s.card, textAlign: "center" as const, padding: "48px 0", color: "#6b7280" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>טוען קהלים...</div>
              </div>
            )}
          </>
        )}

        {activeTab === 4 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>מילות מפתח שליליות</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {negLoading ? "טוען..." : `${negTerms.length} מילים מוצעות`}
                  {negExistingList && <span style={{ marginRight: 10, color: "#00d4aa" }}>✓ רשימה קיימת: {negExistingList.name}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select
                  value={negMatchType}
                  onChange={e => setNegMatchType(e.target.value as "BROAD" | "PHRASE" | "EXACT")}
                  style={{ background: "#181b2a", color: "#e8eaf6", border: "1px solid #2a2d3e", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}
                >
                  <option value="BROAD">התאמה רחבה</option>
                  <option value="PHRASE">התאמת ביטוי</option>
                  <option value="EXACT">התאמה מדויקת</option>
                </select>
                <button style={s.btn("sm")} onClick={loadNegTerms} disabled={negLoading}>
                  {negLoading ? "טוען..." : "רענן"}
                </button>
                <button
                  style={{ ...s.btn("primary"), opacity: negSelected.size === 0 || negApplying ? 0.5 : 1 }}
                  onClick={applyNegKeywords}
                  disabled={negSelected.size === 0 || negApplying}
                >
                  {negApplying ? "מוסיף..." : `הוסף לגוגל אדס (${negSelected.size})`}
                </button>
              </div>
            </div>

            {negResult && (
              <div style={{ background: "#00d4aa12", border: "1px solid #00d4aa44", borderRadius: 12, padding: "14px 20px", marginBottom: 16, fontSize: 13 }}>
                <span style={{ color: "#00d4aa", fontWeight: 700 }}>נוסף בהצלחה!</span>
                {" "}{negResult.added} מילים נוספו לרשימה "{negResult.listName}"
                {negResult.campaignsLinked > 0 && ` • הרשימה קושרה ל-${negResult.campaignsLinked} קמפיינים`}
              </div>
            )}

            {negApiErrors.length > 0 && (
              <div style={{ background: "#f5a62310", border: "1px solid #f5a62333", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#f5a623" }}>
                {negApiErrors.join(" | ")}
              </div>
            )}

            <div style={s.card}>
              {negLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1,2,3,4,5].map(i => <Skeleton key={i} h={36} />)}
                </div>
              ) : negTerms.length === 0 ? (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                  {negApiErrors.length > 0 ? "שגיאה בטעינת הנתונים — בדוק חיבור Google Ads" : "לא נמצאו מילות מפתח מוצעות לתקופה זו"}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 32 }}>
                        <input type="checkbox" checked={negSelected.size === negTerms.length && negTerms.length > 0} onChange={selectAllNeg} style={{ cursor: "pointer" }} />
                      </th>
                      <th style={s.th}>מילת חיפוש</th>
                      <th style={s.th}>מקור</th>
                      <th style={s.th}>סיבה</th>
                      <th style={{ ...s.th, textAlign: "left" as const }}>חשיפות</th>
                      <th style={{ ...s.th, textAlign: "left" as const }}>קליקים</th>
                      <th style={{ ...s.th, textAlign: "left" as const }}>עלות ₪</th>
                    </tr>
                  </thead>
                  <tbody>
                    {negTerms.map((t, i) => {
                      const selected = negSelected.has(t.term);
                      return (
                        <tr key={i} onClick={() => toggleNegTerm(t.term)} style={{ cursor: "pointer", background: selected ? "#7c74ff08" : "transparent" }}>
                          <td style={s.td}>
                            <input type="checkbox" checked={selected} onChange={() => toggleNegTerm(t.term)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer" }} />
                          </td>
                          <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#e8eaf6" }}>{t.term}</td>
                          <td style={s.td}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                              background: t.source === "google_ads" ? "#4285F422" : "#34A85322",
                              color: t.source === "google_ads" ? "#4285F4" : "#34A853" }}>
                              {t.source === "google_ads" ? "Google Ads" : "Search Console"}
                            </span>
                          </td>
                          <td style={{ ...s.td, fontSize: 12, color: "#b0b8d0" }}>{t.reason}</td>
                          <td style={{ ...s.td, textAlign: "left" as const, fontSize: 12 }}>{t.impressions.toLocaleString()}</td>
                          <td style={{ ...s.td, textAlign: "left" as const, fontSize: 12 }}>{t.clicks.toLocaleString()}</td>
                          <td style={{ ...s.td, textAlign: "left" as const, fontSize: 12, color: t.cost > 0 ? "#ff6b6b" : "#6b7280" }}>
                            {t.cost > 0 ? `₪${t.cost.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 5 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>Google Merchant Center</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {merchantLoading ? "טוען..." : merchantData ? `${merchantData.summary?.totalProducts || 0} מוצרים` : "טרם נטען"}
                </div>
              </div>
              <button style={s.btn("sm")} onClick={loadMerchantData} disabled={merchantLoading}>
                {merchantLoading ? "טוען..." : "רענן"}
              </button>
            </div>

            {merchantData?.errors?.length > 0 && (
              <div style={{ background: "#f5a62310", border: "1px solid #f5a62333", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#f5a623" }}>
                {merchantData.errors.join(" | ")}
              </div>
            )}

            {merchantLoading && !merchantData && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                  {[1,2,3,4].map(i => <Skeleton key={i} h={90} r={16} />)}
                </div>
                <Skeleton h={200} r={16} />
              </div>
            )}

            {merchantData && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
                  {[
                    { label: "סה״כ מוצרים", val: merchantData.summary?.totalProducts || 0, color: "#7c74ff" },
                    { label: "מאושרים", val: merchantData.summary?.approved || 0, color: "#00d4aa" },
                    { label: "נדחו", val: merchantData.summary?.disapproved || 0, color: "#ff6b6b" },
                    { label: "אזהרות", val: merchantData.summary?.warnings || 0, color: "#f5a623" },
                  ].map((m, i) => (
                    <div key={i} style={{ ...s.card }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{m.label}</div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: m.color }}>{m.val.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                {merchantData.disapprovedProducts?.length > 0 && (
                  <div style={{ ...s.card, marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "#ff6b6b" }}>
                      ⚠️ מוצרים נדחים ({merchantData.disapprovedProducts.length})
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={s.th}>מוצר</th>
                          <th style={s.th}>סיבות דחייה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {merchantData.disapprovedProducts.map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={{ ...s.td, fontWeight: 600, maxWidth: 280 }}>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                              <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace", marginTop: 2 }}>{p.id}</div>
                            </td>
                            <td style={s.td}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {(p.reasons || []).map((r: string, j: number) => (
                                  <span key={j} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#ff6b6b18", color: "#ff6b6b", display: "inline-block" }}>{r}</span>
                                ))}
                                {!p.reasons?.length && <span style={{ fontSize: 12, color: "#6b7280" }}>—</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {merchantData.topProducts?.length > 0 && (
                  <div style={s.card}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                      🏆 מוצרים מובילים לפי חשיפות
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["מוצר","חשיפות","קליקים","CTR","המרות","הכנסה"].map(h => <th key={h} style={s.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {merchantData.topProducts.map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={{ ...s.td, maxWidth: 260 }}>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{p.title || p.offerId}</div>
                            </td>
                            <td style={s.td}>{p.impressions.toLocaleString()}</td>
                            <td style={s.td}>{p.clicks.toLocaleString()}</td>
                            <td style={s.td}>
                              <span style={{ color: p.ctr > 2 ? "#00d4aa" : "#6b7280" }}>
                                {p.ctr.toFixed(2)}%
                              </span>
                            </td>
                            <td style={s.td}>{p.conversions > 0 ? p.conversions.toFixed(1) : "—"}</td>
                            <td style={s.td}>
                              {p.revenue > 0 ? <span style={{ color: "#00d4aa", fontWeight: 700 }}>₪{Math.round(p.revenue).toLocaleString()}</span> : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!merchantData.topProducts?.length && !merchantData.disapprovedProducts?.length && !merchantData.errors?.length && (
                  <div style={{ ...s.card, textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                    אין נתונים לתקופה זו
                  </div>
                )}
              </>
            )}

            {!merchantData && !merchantLoading && (
              <div style={{ ...s.card, textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🛍️</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Google Merchant Center</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>הוסף את GMC_MERCHANT_ID ב-Vercel כדי לחבר</div>
                <button style={s.btn("primary")} onClick={loadMerchantData}>טען נתונים</button>
              </div>
            )}
          </>
        )}

        {activeTab === 6 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>הגדרות</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                  {settingsLoading
                    ? "בודק חיבורים..."
                    : settingsStatus
                    ? `${settingsStatus.summary?.connected}/${settingsStatus.summary?.total} חיבורים פעילים`
                    : "לחץ בדוק חיבורים"}
                </div>
              </div>
              <button style={s.btn("primary")} onClick={loadSettingsStatus} disabled={settingsLoading}>
                {settingsLoading ? "בודק..." : "בדוק חיבורים"}
              </button>
            </div>

            {settingsLoading && !settingsStatus && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} h={80} r={16} />)}
              </div>
            )}

            {settingsStatus && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "מחוברים", val: settingsStatus.summary?.connected, color: "#00d4aa" },
                    { label: "הגדרה חלקית", val: settingsStatus.integrations?.filter((i: any) => i.status === "partial").length, color: "#f5a623" },
                    { label: "לא מחוברים", val: settingsStatus.integrations?.filter((i: any) => i.status === "disconnected").length, color: "#ff6b6b" },
                  ].map((m, i) => (
                    <div key={i} style={{ ...s.card, textAlign: "center" as const, padding: "16px 12px" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.val}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {(settingsStatus.integrations || []).map((intg: any, i: number) => {
                    const iconMap: Record<string, string> = {
                      WooCommerce: "🛒", "Google Ads": "🔵", "Meta Business": "📘",
                      "Google Analytics 4": "📊", "Search Console": "🔍",
                      "Google Merchant Center": "🛍️", "TikTok Ads": "🎵",
                    };
                    const stColor = intg.status === "connected" ? "#00d4aa" : intg.status === "partial" ? "#f5a623" : "#ff6b6b";
                    const stBg = intg.status === "connected" ? "#00d4aa18" : intg.status === "partial" ? "#f5a62318" : "#ff6b6b18";
                    const stLabel = intg.status === "connected" ? "מחובר" : intg.status === "partial" ? "הגדרה חלקית" : "לא מחובר";
                    const stDot = intg.status === "connected" ? "●" : intg.status === "partial" ? "◐" : "○";
                    return (
                      <div key={i} style={{ ...s.card, opacity: animIn ? 1 : 0, transition: `opacity 0.35s ease ${i * 0.07}s`, borderColor: stColor + "33" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                          <div style={{ fontSize: 28, lineHeight: 1 }}>{iconMap[intg.name] || "🔌"}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{intg.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: stBg, color: stColor }}>
                                {stDot} {stLabel}
                              </span>
                            </div>
                            {intg.detail && (
                              <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", background: "#12141a", padding: "3px 7px", borderRadius: 5, display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {intg.detail}
                              </div>
                            )}
                            {intg.status !== "connected" && (
                              <div style={{ fontSize: 11, color: stColor, marginTop: 4 }}>{intg.message}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 10, color: "#6b7280", fontFamily: "monospace", background: "#181b2a", padding: "2px 6px", borderRadius: 4, display: "inline-block" }}>
                          {intg.key}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {settingsStatus.checkedAt && (
                  <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center" as const, marginTop: 16 }}>
                    נבדק ב-{new Date(settingsStatus.checkedAt).toLocaleTimeString("he-IL")}
                  </div>
                )}
              </>
            )}

            {!settingsStatus && !settingsLoading && (
              <div style={{ ...s.card, textAlign: "center" as const, padding: "48px 0", color: "#6b7280" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>בדוק את סטטוס החיבורים</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>לחץ "בדוק חיבורים" לבדיקה חיה של כל ה-API Keys</div>
                <button style={s.btn("primary")} onClick={loadSettingsStatus}>בדוק חיבורים</button>
              </div>
            )}
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
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </div>
  );
}
