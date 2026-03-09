"use client";
import { useState, useEffect } from "react";
import type { Lang } from "../../lib/i18n";
import { C } from "../theme";
import type { Connection } from "../../lib/auth";

interface DashboardSummary {
  totalSpent: number;
  totalRevenue: number;
  avgRoas: number;
  totalConversions: number;
}
interface Campaign { id: string; roas: number; status: string; }
interface TimePoint { date: string; revenue: number; spend: number; conversions: number; }
interface DashboardData {
  summary: DashboardSummary;
  campaigns: Campaign[];
  ga4: { sessions: number; users: number; revenue: number };
  apiErrors: string[];
  isLive: boolean;
  lastUpdated: string;
  timeSeries?: TimePoint[];
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function mkT(lang: Lang) {
  return (he: string, en: string, es = en, de = en, fr = en, pt = en, ru = en): string => {
    const map: Partial<Record<Lang, string>> = { he, en, es, de, fr, pt, ru };
    return map[lang] ?? en;
  };
}

function generateDemoSeries(days: number): TimePoint[] {
  const result: TimePoint[] = [];
  const now = new Date();
  let revenue = 7000;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    revenue = Math.max(3000, revenue + (Math.random() - 0.44) * 800);
    result.push({
      date: d.toISOString().split("T")[0],
      revenue: Math.round(revenue),
      spend: Math.round(revenue * 0.32),
      conversions: Math.round(revenue / 210),
    });
  }
  return result;
}

/* ── SVG Sparkline ───────────────────────────────────────────────── */
function SparkLine({ data, color, fill }: { data: number[]; color: string; fill?: boolean }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 200, H = 48, P = 4;
  const pts = data.map((v, i) => {
    const x = P + (i / Math.max(data.length - 1, 1)) * (W - P * 2);
    const y = H - P - ((v - min) / range) * (H - P * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(" ");
  const first = pts[0], last = pts[pts.length - 1];
  const areaPath = `M ${first} L ${polyline} L ${last.split(",")[0]},${H - P} L ${P},${H - P} Z`;
  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 48, display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.length > 1 && (() => {
        const [lx, ly] = last.split(",");
        return <circle cx={lx} cy={ly} r="3" fill={color} />;
      })()}
    </svg>
  );
}

/* ── KPI Card ────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, icon, sparkData, trend }: {
  label: string; value: string; sub?: string; color: string; icon: string;
  sparkData?: number[]; trend?: number;
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden", boxShadow: C.shadow }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "14px 14px 0 0" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? C.green : C.red, background: trend >= 0 ? C.greenLight : C.redLight, borderRadius: 20, padding: "2px 8px" }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMuted }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
      {sparkData && sparkData.length > 2 && (
        <div style={{ marginTop: 10 }}><SparkLine data={sparkData} color={color} fill /></div>
      )}
    </div>
  );
}

/* ── Growth Chart (SVG line) ─────────────────────────────────────── */
function GrowthChart({ data, color, lang }: { data: TimePoint[]; color: string; lang: Lang }) {
  const values = data.map(d => d.revenue);
  const max = Math.max(...values, 1);
  const W = 600, H = 100, P = 10;
  const pts = values.map((v, i) => {
    const x = P + (i / Math.max(values.length - 1, 1)) * (W - P * 2);
    const y = P + (1 - v / max) * (H - P * 2);
    return [x, y] as [number, number];
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const lastPt = pts[pts.length - 1];
  const areaPath = `${linePath} L ${lastPt[0].toFixed(1)} ${H - P} L ${P} ${H - P} Z`;
  const gradId = `gc-${color.replace("#", "")}`;
  const isHe = lang === "he";

  const labelEvery = Math.max(1, Math.floor(data.length / 5));
  const labels = data.filter((_, i) => i % labelEvery === 0 || i === data.length - 1);

  return (
    <div>
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 260, height: 100, display: "block" }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map(t => {
            const y = P + t * (H - P * 2);
            return <line key={t} x1={P} y1={y} x2={W - P} y2={y} stroke={C.border} strokeWidth="1" strokeDasharray="4,4" />;
          })}
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.filter((_, i) => i % labelEvery === 0 || i === pts.length - 1).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill={color} stroke={C.card} strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {labels.map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: C.textMuted }}>
            {new Date(d.date).toLocaleDateString(isHe ? "he-IL" : "en-US", { month: "short", day: "numeric" })}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────────── */
function EmptyState({ lang, onConnect }: { lang: Lang; onConnect: () => void }) {
  const t = mkT(lang);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 24, textAlign: "center" }}>
      <div style={{ fontSize: 64 }}>🚀</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 12 }}>
          {t("ברוך הבא ל-BScale AI!", "Welcome to BScale AI!", "¡Bienvenido a BScale AI!", "Willkommen bei BScale AI!", "Bienvenue sur BScale AI!", "Bem-vindo ao BScale AI!")}
        </div>
        <div style={{ fontSize: 14, color: C.textSub, maxWidth: 460, lineHeight: 1.7 }}>
          {t(
            "חבר את החנות ופלטפורמות הפרסום כדי לראות נתוני ביצועים, גרפי צמיחה והמלצות AI.",
            "Connect your store and ad platforms to see performance data, growth charts and AI recommendations.",
            "Conecta tu tienda y plataformas de anuncios para ver datos de rendimiento y recomendaciones IA.",
            "Verbinde Shop und Werbeplattformen für Leistungsdaten, Wachstumsdiagramme und KI-Empfehlungen.",
            "Connecte ta boutique et tes plateformes pour voir les données de performance et recommandations IA.",
            "Conecte sua loja e plataformas de anúncios para ver dados de desempenho e recomendações IA."
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {["🛍️ WooCommerce", "🔵 Google Ads", "✨ Gemini AI"].map((item, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", fontSize: 13, color: C.textSub, fontWeight: 600 }}>
            {item}
          </div>
        ))}
      </div>
      <button onClick={onConnect}
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}>
        {t("חבר עכשיו →", "Connect Now →", "Conectar ahora →", "Jetzt verbinden →", "Connecter maintenant →", "Conectar agora →")}
      </button>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
/* ── GA4 Traffic Section ─────────────────────────────────────────── */
function GA4TrafficSection({ lang, ga4 }: { lang: Lang; ga4: { sessions: number; users: number; revenue: number } }) {
  const t = mkT(lang);
  const safeSessions = ga4.sessions || 1200;
  const mockSources = [
    { source: t("חיפוש אורגני", "Organic Search"), pct: 0.41, color: "#10b981" },
    { source: t("חיפוש ממומן", "Paid Search"),     pct: 0.28, color: "#6366f1" },
    { source: t("ישיר", "Direct"),                  pct: 0.18, color: "#3b82f6" },
    { source: t("רשתות חברתיות", "Social"),         pct: 0.09, color: "#f59e0b" },
    { source: t("אחר", "Other"),                    pct: 0.04, color: "#94a3b8" },
  ];
  const mockPages = [
    { label: t("דף הבית", "Home"), pct: 0.31 },
    { label: t("מוצרים", "Products"), pct: 0.22 },
    { label: t("מבצעים", "Sale"), pct: 0.15 },
    { label: t("אודות", "About"), pct: 0.09 },
    { label: t("צור קשר", "Contact"), pct: 0.06 },
  ];
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: C.shadow }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>
        📊 {t("תנועת אתר — Google Analytics 4", "Website Traffic — Google Analytics 4")}
      </div>
      <div className="as-analytics-3col" style={{ marginBottom: 20 }}>
        {[
          { label: t("סשנים", "Sessions"), value: (ga4.sessions || 1247).toLocaleString(), color: "#6366f1" },
          { label: t("משתמשים", "Users"),  value: (ga4.users  || 984).toLocaleString(),  color: "#10b981" },
          { label: t("הכנסה", "Revenue"),  value: `₪${(ga4.revenue || 32400).toLocaleString()}`, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ background: C.pageBg, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="as-analytics-2col">
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 10 }}>🌐 {t("מקורות תנועה", "Traffic Sources")}</div>
          {mockSources.map(s => (
            <div key={s.source} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1.5, fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.source}</div>
              <div style={{ background: C.pageBg, borderRadius: 4, height: 6, flex: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: s.color, width: `${Math.round(s.pct * 100)}%`, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, minWidth: 36, textAlign: "right" }}>{Math.round(s.pct * 100)}%</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 10 }}>📄 {t("עמודים פופולריים", "Top Pages")}</div>
          {mockPages.map((p, i) => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: C.pageBg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 12, color: C.text }}>{p.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{Math.round(p.pct * safeSessions).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── SEO Status Section ──────────────────────────────────────────── */
function SEOStatusSection({ lang, onGoToSEO }: { lang: Lang; onGoToSEO?: () => void }) {
  const t = mkT(lang);
  const seo = { clicks: 3842, impressions: 48200, avgPosition: 14.3, ctr: 7.97 };
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: C.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
          🔍 {t("סטטוס SEO — Google Search Console", "SEO Status — Google Search Console")}
        </div>
        {onGoToSEO && (
          <button onClick={onGoToSEO} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #10b98144", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
            🎯 {t("מרכז SEO", "SEO Center")} →
          </button>
        )}
      </div>
      <div className="as-analytics-4col">
        {[
          { label: t("קליקים", "Clicks"),           value: seo.clicks.toLocaleString(),   icon: "👆", color: "#3b82f6", sub: "+12% " + t("מהחודש שעבר", "vs last month") },
          { label: t("חשיפות", "Impressions"),       value: seo.impressions.toLocaleString(), icon: "👁️", color: "#6366f1", sub: "+8% " + t("מהחודש שעבר", "vs last month") },
          { label: t("מיקום ממוצע", "Avg Position"), value: `#${seo.avgPosition}`,         icon: "📊", color: "#f59e0b", sub: t("שיפור מ-16.1", "Improved from 16.1") },
          { label: "CTR",                            value: `${seo.ctr}%`,                  icon: "🎯", color: "#10b981", sub: t("מעל לממוצע", "Above average") },
        ].map(s => (
          <div key={s.label} style={{ background: C.pageBg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: s.color, marginTop: 4, fontWeight: 600 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function OverviewModule({
  lang,
  connections,
  onGoToConnections,
  onGoToSEO,
  dateFrom,
  dateTo,
}: {
  lang: Lang;
  connections?: Record<string, Connection>;
  onGoToConnections?: () => void;
  onGoToSEO?: () => void;
  dateFrom?: string;
  dateTo?: string;
}) {
  const t = mkT(lang);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const hasConnections = connections && Object.values(connections).some(c => c.connected);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch { setData(null); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (!hasConnections && !loading) {
    return <EmptyState lang={lang} onConnect={onGoToConnections ?? (() => {})} />;
  }

  if (loading) return <LoadingSkeleton />;

  const s = data?.summary ?? { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 };
  const campaigns = data?.campaigns ?? [];
  const netProfit = s.totalRevenue - s.totalSpent;
  const poas = s.totalSpent > 0 ? netProfit / s.totalSpent : 0;
  const profitable  = campaigns.filter(c => c.roas > 1 && c.status === "active").length;
  const unprofitable = campaigns.filter(c => c.roas <= 1 && c.status === "active").length;
  const ga4 = data?.ga4 ?? { sessions: 0, users: 0, revenue: 0 };

  const timeSeries = data?.timeSeries ?? generateDemoSeries(30);
  const revData  = timeSeries.map(d => d.revenue);
  const spData   = timeSeries.map(d => d.spend);
  const convData = timeSeries.map(d => d.conversions);

  const last7 = revData.slice(-7).reduce((a, b) => a + b, 0);
  const prev7 = revData.slice(-14, -7).reduce((a, b) => a + b, 0);
  const revTrend = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;
  const spLast7 = spData.slice(-7).reduce((a, b) => a + b, 0);
  const spPrev7 = spData.slice(-14, -7).reduce((a, b) => a + b, 0);
  const spTrend  = spPrev7 > 0 ? ((spLast7 - spPrev7) / spPrev7) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 14 }}>
        <StatCard label={t("הוצאה כוללת","Total Ad Spend","Gasto total","Gesamtausgaben","Dépenses totales","Gasto total")}
          value={`₪${s.totalSpent.toLocaleString("he-IL",{maximumFractionDigits:0})}`}
          color="#7c74ff" icon="💸" sparkData={spData.slice(-14)} trend={spTrend} />
        <StatCard label={t("הכנסה","Revenue","Ingresos","Einnahmen","Revenus","Receita")}
          value={`₪${s.totalRevenue.toLocaleString("he-IL",{maximumFractionDigits:0})}`}
          color="#00d4aa" icon="💰" sparkData={revData.slice(-14)} trend={revTrend} />
        <StatCard label={t("רווח נקי","Net Profit","Ganancia neta","Nettogewinn","Bénéfice net","Lucro líquido")}
          value={`₪${netProfit.toLocaleString("he-IL",{maximumFractionDigits:0})}`}
          sub={s.totalRevenue>0?`${((netProfit/s.totalRevenue)*100).toFixed(1)}% margin`:undefined}
          color={netProfit>=0?"#10b981":"#ef4444"} icon="📈" />
        <StatCard label="ROAS" value={`${s.avgRoas.toFixed(2)}x`} color="#f59e0b" icon="🎯" />
        <StatCard label="POAS" value={`${poas.toFixed(2)}x`}
          sub={t("רווח על הוצאת פרסום","Profit on Ad Spend","Beneficio sobre gasto","Gewinn auf Werbeausgaben","Profit sur dépenses","Lucro sobre gastos")}
          color="#a78bfa" icon="🏆" />
        <StatCard label={t("המרות","Conversions","Conversiones","Konversionen","Conversions","Conversões")}
          value={s.totalConversions.toLocaleString()} color="#3b82f6" icon="🛒"
          sparkData={convData.slice(-14)} />
        <StatCard label={t("קמפיינים רווחיים","Profitable Campaigns","Campañas rentables","Profitable Kampagnen","Campagnes rentables","Campanhas rentáveis")}
          value={String(profitable)}
          sub={`${unprofitable} ${t("לא רווחיים","unprofitable","no rentables","nicht profitabel","non rentables","não rentáveis")}`}
          color="#10b981" icon="✅" />
      </div>

      {/* GA4 Traffic */}
      <GA4TrafficSection lang={lang} ga4={ga4} />

      {/* SEO Status */}
      <SEOStatusSection lang={lang} onGoToSEO={onGoToSEO} />

      {/* Growth charts */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: C.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
              📈 {t("צמיחת עסק — 30 יום","Business Growth — 30 Days","Crecimiento — 30 días","Wachstum — 30 Tage","Croissance — 30 jours","Crescimento — 30 dias")}
            </div>
            {!data?.isLive && (
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                ⚡ {t("נתוני דמו — חבר חנות לנתונים אמיתיים","Demo data — connect store for real data","Datos demo — conecta tu tienda","Demo-Daten — verbinde Shop","Données démo — connecte ta boutique","Dados demo — conecte sua loja")}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[{color:"#00d4aa",label:t("הכנסה","Revenue")},{color:"#7c74ff",label:t("הוצאה","Spend")}].map(l => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSub }}>
                <span style={{ width: 12, height: 3, background: l.color, borderRadius: 2, display: "inline-block" }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Revenue line */}
        <GrowthChart data={timeSeries} color="#00d4aa" lang={lang} />

        {/* Spend mini-chart */}
        <div style={{ marginTop: 14, background: C.cardAlt, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>💸 {t("הוצאות","Spend","Gastos","Ausgaben","Dépenses","Gastos")}</span>
            <span style={{ fontSize: 11, color: spTrend >= 0 ? C.amber : C.green, fontWeight: 700 }}>
              {spTrend >= 0 ? "↑" : "↓"} {Math.abs(spTrend).toFixed(1)}%
            </span>
          </div>
          <SparkLine data={spData} color="#7c74ff" fill />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: C.shadow }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>
          ⚡ {t("פעולות מהירות","Quick Actions","Acciones rápidas","Schnellaktionen","Actions rapides","Ações rápidas")}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {([
            { label: [t("🤖 הפעל ניתוח AI","🤖 Run AI Analysis","🤖 Análisis IA","🤖 KI-Analyse","🤖 Analyse IA","🤖 Análise IA")], color: "#6366f1" },
            { label: [t("🔍 סווג שאילתות","🔍 Classify Queries","🔍 Clasificar consultas","🔍 Abfragen klassifizieren","🔍 Classifier requêtes","🔍 Classificar consultas")], color: "#3b82f6" },
            { label: [t("✅ אשר פעולות","✅ Approve Actions","✅ Aprobar acciones","✅ Aktionen genehmigen","✅ Approuver actions","✅ Aprovar ações")], color: "#10b981" },
            { label: [t("📊 דוח רווחיות","📊 Profit Report","📊 Informe ganancias","📊 Gewinnbericht","📊 Rapport profit","📊 Relatório lucro")], color: "#f59e0b" },
          ]).map((btn, i) => (
            <button key={i} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${btn.color}44`, background: `${btn.color}11`, color: btn.color, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {btn.label[0]}
            </button>
          ))}
        </div>
        {data?.lastUpdated && (
          <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted }}>
            {t("עודכן","Last updated")}: {new Date(data.lastUpdated).toLocaleTimeString(lang === "he" ? "he-IL" : "en-US")}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 14 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="as-skeleton" style={{ borderRadius: 14, height: 110 }} />
        ))}
      </div>
      <div className="as-skeleton" style={{ borderRadius: 14, height: 220 }} />
    </div>
  );
}
