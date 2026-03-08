"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isOnboardingComplete } from "./lib/auth";

const FEATURES = [
  { icon: "🎯", title: "ניהול קמפיינים חכם", titleEn: "Smart Campaign Management", desc: "מנוע AI שמנתח את הנתונים שלך ומייעל תקציבים בזמן אמת לרווחיות מקסימלית", descEn: "AI engine analyzes your data and optimizes budgets in real-time for maximum profitability" },
  { icon: "✍️", title: "Creative Lab עם AI", titleEn: "AI-Powered Creative Lab", desc: "יצירת מודעות טקסט ותמונה אוטומטית עם חיבור ישיר לפרסום ב-Meta, Google ו-TikTok", descEn: "Auto-generate text and image ads with direct publishing to Meta, Google, and TikTok" },
  { icon: "🔍", title: "SEO & GEO מתקדם", titleEn: "Advanced SEO & GEO", desc: "ניתוח AI לאופטימיזציית תוכן, Schema markup וסקירת נראות ב-AI Overviews של Google", descEn: "AI analysis for content optimization, Schema markup, and visibility in Google AI Overviews" },
  { icon: "👥", title: "ניהול קהלים חכם", titleEn: "Smart Audience Management", desc: "סנכרון קהלים, lookalike audiences וניתוח חפיפות בין Google, Meta ו-TikTok", descEn: "Sync audiences, create lookalikes, and analyze overlaps across Google, Meta, and TikTok" },
  { icon: "💹", title: "דוחות כספיים + SEO", titleEn: "Financial + SEO Reports", desc: "מעקב ROAS, CPA, רווח נקי וניתוח SEO — ייצוא לאקסל בלחיצה אחת", descEn: "Track ROAS, CPA, net profit and SEO analysis — export to Excel in one click" },
  { icon: "🤖", title: "אוטומציה מבוססת כללים", titleEn: "Rule-Based Automation", desc: "הגדר כללים חכמים שמגיבים לנתוני ביצועים בזמן אמת — ללא התערבות ידנית", descEn: "Set smart rules that react to real-time performance data — no manual intervention needed" },
  { icon: "🛒", title: "אינטגרציה מלאה", titleEn: "Full Integration", desc: "התחבר ל-WooCommerce, Shopify, GA4, GSC וכל פלטפורמות הפרסום בהגדרה של דקות", descEn: "Connect to WooCommerce, Shopify, GA4, GSC, and all ad platforms in minutes" },
  { icon: "✉️", title: "Gmail — דוחות אוטומטיים", titleEn: "Gmail — Automated Reports", desc: "חבר Gmail לשליחת דוחות שבועיים, עדכונים ברגע שמשהו חורג, והזמנות לצוות", descEn: "Connect Gmail to send weekly reports, threshold alerts, and team invitations automatically" },
];

const STEPS = [
  { num: "01", title: "התחבר את הפלטפורמות", titleEn: "Connect Your Platforms", desc: "חבר את חשבונות הפרסום, החנות ו-Analytics שלך בכמה קליקים", descEn: "Connect your ad accounts, store, and analytics in a few clicks" },
  { num: "02", title: "ה-AI מנתח ולומד", titleEn: "AI Analyzes & Learns", desc: "המערכת סורקת את הנתונים ההיסטוריים שלך ומזהה הזדמנויות שיפור", descEn: "The system scans your historical data and identifies improvement opportunities" },
  { num: "03", title: "צמח עם המלצות חכמות", titleEn: "Grow with Smart Recommendations", desc: "קבל המלצות בזמן אמת, יישם בלחיצה אחת וצפה בתוצאות מיידיות", descEn: "Get real-time recommendations, apply with one click, and watch results improve immediately" },
];

const PLANS = [
  {
    name: "Professional", nameHe: "פרופשיונל", price: "$200", period: "/ חודש", color: "#6366f1",
    tagHe: "למותגים וחנויות", tagEn: "For brands & stores",
    features: ["כל ערוצי הפרסום (Google, Meta, TikTok)", "AI Creative Lab", "SEO & GEO מתקדם", "ניהול קהלים + Lookalike", "דוחות כספיים + SEO", "אוטומציה מבוססת כללים", "חיבור WooCommerce / Shopify", "Gmail — דוחות אוטומטיים", "תמיכה עדיפות"],
    featuresEn: ["All ad channels (Google, Meta, TikTok)", "AI Creative Lab", "Advanced SEO & GEO", "Audience management + Lookalike", "Financial + SEO reports", "Rule-based automation", "WooCommerce / Shopify integration", "Gmail — automated reports", "Priority support"],
  },
  {
    name: "Enterprise", nameHe: "אנטרפרייז", price: "$500", period: "/ חודש", color: "#10b981", popular: true,
    tagHe: "לסוכנויות דיגיטל", tagEn: "For digital agencies",
    features: ["הכל ב-Professional", "ניהול ריבוי חנויות", "לוח בקרה לסוכנות", "API גישה מלאה", "דוחות White-label", "CSM ייעודי", "SLA מובטח", "הדרכה ואונבורדינג VIP"],
    featuresEn: ["Everything in Professional", "Multi-store management", "Agency dashboard", "Full API access", "White-label reports", "Dedicated CSM", "Guaranteed SLA", "VIP onboarding & training"],
  },
];

const STATS = [
  { value: "340%", label: "ROAS ממוצע",          labelEn: "Average ROAS"        },
  { value: "68%",  label: "חיסכון בזמן",         labelEn: "Time saved"          },
  { value: "2.4x", label: "יותר המרות",           labelEn: "More conversions"    },
  { value: "12K+", label: "קמפיינים אוטומטיים",  labelEn: "Automated campaigns" },
];

const CHART_BARS = [40,65,50,80,60,90,75,95,70,85];
const PLATFORM_BARS = [
  { label: "Google Ads", pct: 72, color: "#4285f4" },
  { label: "Meta Ads",   pct: 58, color: "#1877f2" },
  { label: "TikTok",     pct: 84, color: "#00f2ea" },
];

export default function LandingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"he" | "en">("he");
  const [menuOpen, setMenuOpen] = useState(false);
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;

  useEffect(() => {
    const user = getUser();
    if (user) router.replace(isOnboardingComplete() ? "/modules" : "/onboarding");
  }, [router]);

  const navLinks: [string, string][] = [
    ["features",  t("יכולות", "Features")],
    ["how",       t("איך זה עובד", "How it works")],
    ["pricing",   t("תמחור", "Pricing")],
    ["investors", t("משקיעים", "Investors")],
  ];

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      direction: isHe ? "rtl" : "ltr",
      background: "#0a0a14",
      color: "#fff",
      minHeight: "100vh",
      overflowX: "hidden",
    }}>

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(10,10,20,0.92)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0 20px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 19, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BScale AI</span>
        </div>

        {/* Desktop nav links */}
        <div className="lp-desktop-only" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {navLinks.map(([id, label]) => (
            <a key={id} href={`#${id}`} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}>{label}</a>
          ))}
        </div>

        {/* Right-side actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language toggle — always visible */}
          <button
            onClick={() => setLang(l => l === "he" ? "en" : "he")}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 11px", color: "#fff", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
          >{isHe ? "EN" : "עב"}</button>

          {/* Login + Start — hidden on mobile */}
          <button className="lp-nav-hide-mobile" onClick={() => router.push("/login")}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "7px 16px", color: "#fff", cursor: "pointer", fontSize: 13 }}>
            {t("כניסה", "Login")}
          </button>
          <button className="lp-nav-hide-mobile" onClick={() => router.push("/login?mode=signup")}
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, padding: "7px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            {t("התחל בחינם", "Start Free")}
          </button>

          {/* Hamburger — mobile only */}
          <button className="lp-mobile-only" onClick={() => setMenuOpen(m => !m)}
            style={{ background: menuOpen ? "rgba(99,102,241,0.2)" : "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff", fontSize: 20, cursor: "pointer", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 60, left: 0, right: 0, zIndex: 99,
          background: "rgba(10,10,20,0.97)",
          padding: "24px 20px 20px",
          display: "flex", flexDirection: "column", gap: 0,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}>
          {navLinks.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}
              style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: 17, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: 500 }}>
              {label}
            </a>
          ))}
          {/* Auth buttons inside menu */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button onClick={() => { router.push("/login"); setMenuOpen(false); }}
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "13px 0", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
              {t("כניסה", "Login")}
            </button>
            <button onClick={() => { router.push("/login?mode=signup"); setMenuOpen(false); }}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "13px 0", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
              {t("התחל בחינם — 14 יום ניסיון", "Start Free — 14 Day Trial")}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="lp-hero" style={{ paddingTop: 120, paddingBottom: 72, paddingLeft: 20, paddingRight: 20, textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: "min(700px, 100vw)", height: 460, background: "radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto" }}>
          {/* Badge */}
          <div style={{ display: "inline-block", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "#a5b4fc", marginBottom: 22 }}>
            🚀 {t("הפלטפורמה מספר 1 לניהול פרסום עם AI", "The #1 AI-powered advertising management platform")}
          </div>

          {/* H1 */}
          <h1 style={{ fontSize: "clamp(30px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1, margin: "0 0 20px" }}>
            {t("נהל את הפרסום שלך", "Manage Your Advertising")}
            <br />
            <span style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("עם כוח של AI", "With the Power of AI")}
            </span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: "clamp(14px, 2.5vw, 19px)", color: "rgba(255,255,255,0.6)", maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.7 }}>
            {t(
              "חסוך שעות של עבודה ידנית. BScale AI מנתחת נתונים, מייעלת תקציבים, יוצרת קריאייטיב ומגדילה את ה-ROAS שלך אוטומטית.",
              "Save hours of manual work. BScale AI analyzes data, optimizes budgets, creates creatives, and automatically grows your ROAS."
            )}
          </p>

          {/* CTA buttons */}
          <div className="lp-hero-cta">
            <button onClick={() => router.push("/login?mode=signup")}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "15px 32px", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, boxShadow: "0 4px 28px rgba(99,102,241,0.4)", whiteSpace: "nowrap" }}>
              {t("התחל בחינם — 14 יום ניסיון", "Start Free — 14 Day Trial")}
            </button>
            <button onClick={() => router.push("/modules")}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "15px 32px", color: "#fff", cursor: "pointer", fontSize: 16, whiteSpace: "nowrap" }}>
              {t("צפה בהדגמה חיה ▶", "View Live Demo ▶")}
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
            {[t("ללא כרטיס אשראי","No credit card"), t("ביטול בכל עת","Cancel anytime"), t("GDPR תואם","GDPR compliant")].map(b => (
              <span key={b} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "#10b981" }}>✓</span>{b}
              </span>
            ))}
          </div>
        </div>

        {/* ── Dashboard mockup ── */}
        <div style={{ maxWidth: 880, margin: "52px auto 0", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 16px 12px", boxShadow: "0 28px 70px rgba(0,0,0,0.45)" }}>
          {/* Window chrome */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
            <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 22, marginInlineStart: 8, display: "flex", alignItems: "center", paddingInlineStart: 10 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>app.bscale.ai/modules</span>
            </div>
          </div>

          {/* Stats row — 4 col on desktop, 2 col on mobile */}
          <div className="lp-mockup-stats">
            {STATS.map((s, i) => (
              <div key={i} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 800, color: "#a5b4fc" }}>{s.value}</div>
                <div style={{ fontSize: "clamp(9px, 1.5vw, 11px)", color: "rgba(255,255,255,0.45)", marginTop: 3, lineHeight: 1.3 }}>{t(s.label, s.labelEn)}</div>
              </div>
            ))}
          </div>

          {/* Charts row — 2-col on desktop, stacked on mobile */}
          <div className="lp-mockup-charts">
            {/* Bar chart */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "flex-end", justifyContent: "center", minHeight: 90 }}>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 64 }}>
                {CHART_BARS.map((h, i) => (
                  <div key={i} style={{ width: "clamp(12px, 2vw, 20px)", height: `${h}%`, background: i === 9 ? "linear-gradient(180deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.28)", borderRadius: "3px 3px 0 0" }} />
                ))}
              </div>
            </div>
            {/* Progress bars */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              {PLATFORM_BARS.map((p, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
                    <span>{p.label}</span><span style={{ fontWeight: 700, color: p.color }}>{p.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
                    <div style={{ width: `${p.pct}%`, height: "100%", background: p.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAND
      ══════════════════════════════════════════ */}
      <section style={{ background: "rgba(99,102,241,0.06)", borderTop: "1px solid rgba(99,102,241,0.15)", borderBottom: "1px solid rgba(99,102,241,0.15)", padding: "44px 20px" }}>
        <div className="lp-stats-band-grid">
          {STATS.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 900, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(12px, 1.8vw, 14px)", marginTop: 6 }}>{t(s.label, s.labelEn)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section id="features" className="lp-section-pad" style={{ padding: "80px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 800, marginBottom: 14, margin: "0 0 14px" }}>{t("כל מה שאתה צריך", "Everything You Need")}</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(14px, 2vw, 17px)", maxWidth: 520, margin: "0 auto" }}>
            {t("פלטפורמה שלמה לניהול, אופטימיזציה ויצירת פרסום דיגיטלי", "A complete platform for managing, optimizing, and creating digital advertising")}
          </p>
        </div>
        <div className="lp-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {FEATURES.map((f, i) => (
            <div key={i}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "22px 20px", transition: "border-color 0.2s, background 0.2s", cursor: "default" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "rgba(99,102,241,0.4)"; el.style.background = "rgba(99,102,241,0.06)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "rgba(255,255,255,0.07)"; el.style.background = "rgba(255,255,255,0.03)"; }}
            >
              <div style={{ fontSize: 30, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#e2e8f0", margin: "0 0 8px" }}>{t(f.title, f.titleEn)}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.65, margin: 0 }}>{t(f.desc, f.descEn)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how" className="lp-section-pad" style={{ padding: "80px 20px", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 800, marginBottom: 14, margin: "0 0 14px" }}>{t("איך זה עובד?", "How Does It Work?")}</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(14px, 2vw, 17px)", marginBottom: 48 }}>{t("שלושה צעדים פשוטים להתחלה", "Three simple steps to get started")}</p>
          <div className="lp-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "0 12px" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, margin: "0 auto 18px", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>{s.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, margin: "0 0 8px" }}>{t(s.title, s.titleEn)}</h3>
                <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.48)", lineHeight: 1.7, margin: 0 }}>{t(s.desc, s.descEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}
      <section id="pricing" className="lp-section-pad" style={{ padding: "80px 20px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 800, marginBottom: 14, margin: "0 0 14px" }}>{t("מחירים שקופים", "Transparent Pricing")}</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(14px, 2vw, 17px)" }}>{t("ללא עמלות נסתרות. ביטול בכל עת.", "No hidden fees. Cancel anytime.")}</p>
        </div>
        <div className="lp-pricing-grid">
          {PLANS.map((p, i) => (
            <div key={i} style={{
              position: "relative",
              background: p.popular ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${p.popular ? p.color : "rgba(255,255,255,0.08)"}`,
              borderRadius: 18, padding: "30px 24px",
              boxShadow: p.popular ? "0 0 40px rgba(16,185,129,0.12)" : "none",
            }}>
              {p.popular && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "#fff", borderRadius: 20, padding: "3px 16px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {t("הכי פופולרי", "Most Popular")}
                </div>
              )}
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{t(p.nameHe, p.name)}</div>
              <div style={{ fontSize: 12, color: p.color, fontWeight: 600, marginBottom: 14 }}>{t((p as any).tagHe, (p as any).tagEn)}</div>
              <div style={{ fontSize: "clamp(32px, 5vw, 42px)", fontWeight: 900, color: p.color, marginBottom: 2 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginBottom: 24 }}>{p.period}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 9 }}>
                {(isHe ? p.features : p.featuresEn).map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "rgba(255,255,255,0.72)" }}>
                    <span style={{ color: p.color, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push("/login?mode=signup")}
                style={{ width: "100%", background: p.popular ? `linear-gradient(135deg,${p.color},${p.color}cc)` : "rgba(255,255,255,0.06)", border: p.popular ? "none" : "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 0", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                {t("התחל עכשיו", "Get Started")}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TECHNOLOGY ARTICLE TEASER
      ══════════════════════════════════════════ */}
      <section style={{ padding: "80px 20px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 22,
          padding: "48px 40px",
          display: "flex",
          gap: 40,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          {/* Icon */}
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0, boxShadow: "0 8px 32px rgba(99,102,241,0.35)" }}>
            📖
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              {t("מאמר טכנולוגיה", "Technology Deep-Dive")}
            </div>
            <h2 style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800, margin: "0 0 12px", lineHeight: 1.25 }}>
              {t(
                "כיצד BScale AI מנתח מיליוני נקודות נתונים בזמן אמת",
                "How BScale AI Analyzes Millions of Data Points in Real Time"
              )}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.52)", fontSize: "clamp(13px, 1.8vw, 15px)", lineHeight: 1.75, margin: "0 0 24px" }}>
              {t(
                "מאחורי הקלעים: הארכיטקטורה שמאפשרת לנו לעבד נתוני קמפיינים, לזהות דפוסים ולהמליץ על פעולות — הכל בתוך שניות.",
                "Behind the scenes: the architecture that lets us process campaign data, detect patterns, and recommend actions — all within seconds."
              )}
            </p>
            <button
              onClick={() => router.push("/article")}
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                border: "none", borderRadius: 10,
                padding: "11px 26px", color: "#fff",
                cursor: "pointer", fontSize: 14, fontWeight: 700,
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
              }}
            >
              {t("קרא את המאמר המלא ←", "Read Full Article →")}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          INVESTOR SECTION
      ══════════════════════════════════════════ */}
      <section id="investors" style={{ padding: "80px 20px", background: "rgba(16,185,129,0.03)", borderTop: "1px solid rgba(16,185,129,0.1)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "6px 18px", fontSize: 12, color: "#34d399", letterSpacing: 1, textTransform: "uppercase" as const, fontWeight: 700, marginBottom: 18 }}>
              {t("פולדר צמיחה למשקיע", "Investor Growth Folder")}
            </div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 800, margin: "0 0 14px" }}>
              {t("BScale AI — הזדמנות השקעה", "BScale AI — Investment Opportunity")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(14px, 2vw, 17px)", maxWidth: 600, margin: "0 auto" }}>
              {t(
                "מערכת הפעלה לצמיחה (Growth OS) מבוססת AI לחנויות WooCommerce — שוק של מיליארדי דולרים עם מודל SaaS רווחי",
                "AI-powered Growth Operating System for WooCommerce stores — a multi-billion dollar market with a profitable SaaS model"
              )}
            </p>
          </div>

          {/* TAM / SAM / SOM */}
          <div style={{ marginBottom: 52 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#34d399", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 22, textAlign: "center" }}>
              {t("ניתוח שוק", "Market Analysis")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
              {[
                {
                  label: "TAM", sublabel: t("כלל השוק האפשרי", "Total Addressable Market"),
                  value: "$10.9B", note: t("4.53M חנויות WooCommerce × $200/חודש × 12", "4.53M WooCommerce stores × $200/mo × 12"),
                  color: "#6366f1",
                },
                {
                  label: "SAM", sublabel: t("שוק ניתן לשירות", "Serviceable Addressable Market"),
                  value: "$1.6B", note: t("~15% מהחנויות עם תקציב שיווק פעיל ($1K–$50K/חודש)", "~15% of stores with active $1K–$50K/mo marketing budget"),
                  color: "#8b5cf6",
                },
                {
                  label: "SOM", sublabel: t("יעד חדירה ריאלי — 1%", "Realistic Penetration — 1%"),
                  value: "$16M ARR", note: t("~6,800 לקוחות × $200/חודש — יעד שנה 3", "~6,800 customers × $200/mo — Year 3 target"),
                  color: "#10b981",
                },
              ].map((item, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${item.color}30`, borderRadius: 16, padding: "26px 22px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.sublabel}</span>
                  </div>
                  <div style={{ fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 900, color: "#fff", marginBottom: 10 }}>{item.value}</div>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Financial projections */}
          <div style={{ marginBottom: 52 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#34d399", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 22, textAlign: "center" }}>
              {t("תחזית פיננסית 3 שנים", "3-Year Financial Projections")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                {
                  year: t("שנה 1", "Year 1"), customers: "500", arr: "$1.5M",
                  metrics: [
                    { k: t("רווח גולמי", "Gross Margin"), v: "~75%" },
                    { k: t("Churn חודשי", "Monthly Churn"), v: "<3%" },
                    { k: t("COGS ללקוח", "COGS per customer"), v: "$60" },
                  ],
                  color: "#6366f1", glow: false,
                },
                {
                  year: t("שנה 2", "Year 2"), customers: "2,000", arr: "$5.5M",
                  metrics: [
                    { k: "MoM Growth", v: "~15%" },
                    { k: "LTV", v: "~$7,200" },
                    { k: "CAC Payback", v: "<6 mo" },
                  ],
                  color: "#8b5cf6", glow: false,
                },
                {
                  year: t("שנה 3", "Year 3"), customers: "5,000", arr: "$15M",
                  metrics: [
                    { k: t("ARR יעד", "ARR Target"), v: "$15M" },
                    { k: t("רווח נקי", "Net Margin"), v: ">40%" },
                    { k: "NRR", v: ">120%" },
                  ],
                  color: "#10b981", glow: true,
                },
              ].map((yr, i) => (
                <div key={i} style={{
                  background: yr.glow ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${yr.color}40`,
                  borderRadius: 16, padding: "26px 22px",
                  boxShadow: yr.glow ? `0 0 30px ${yr.color}18` : "none",
                }}>
                  <div style={{ fontSize: 12, color: yr.color, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>{yr.year}</div>
                  <div style={{ fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 900, color: yr.color, marginBottom: 2 }}>{yr.arr}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>{yr.customers} {t("לקוחות", "customers")}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {yr.metrics.map((m, j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>{m.k}</span>
                        <span style={{ color: "#fff", fontWeight: 700 }}>{m.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GTM strategy */}
          <div style={{ marginBottom: 44 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#34d399", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 22, textAlign: "center" }}>
              {t("אסטרטגיית חדירה לשוק (GTM)", "Go-To-Market Strategy")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {[
                {
                  icon: "🤝", title: t("שותפויות עם סוכנויות", "Agency Partnerships"),
                  desc: t("500 הלקוחות הראשונים דרך שותפויות עם סוכנויות דיגיטל המנהלות חנויות WooCommerce — Channel effect מיידי", "First 500 customers via partnerships with digital agencies managing WooCommerce stores — immediate channel effect"),
                },
                {
                  icon: "📧", title: t("דיוור ישיר למותגי איקומרס", "Direct Outreach to E-Commerce Brands"),
                  desc: t("קמפיין cold-email ממוקד למנהלי חנויות עם תקציב שיווק פעיל — המרה ניסיון → תשלום: יעד 15%", "Targeted cold-email campaign to store managers with active marketing budgets — trial to paid conversion target: 15%"),
                },
                {
                  icon: "✍️", title: t("שיווק תוכן + SEO", "Content Marketing + SEO"),
                  desc: t("מאמרים, מדריכים ו-case studies לבעלי חנויות שמחפשים שיפור ROAS — ערוץ Inbound אורגני לטווח בינוני", "Articles, guides & case studies for store owners seeking ROAS improvement — organic inbound channel for mid-term"),
                },
                {
                  icon: "📈", title: t("Upsell סוכנויות → Enterprise", "Agency Upsell → Enterprise"),
                  desc: t("כל סוכנות שמנהלת 10+ חנויות = לקוח Enterprise $500/חודש. Network effect: סוכנות אחת מביאה עשרות חנויות", "Each agency managing 10+ stores = $500/mo Enterprise client. Network effect: one agency brings dozens of stores"),
                },
              ].map((item, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "22px 20px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: "0 0 10px" }}>{item.title}</h4>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.46)", lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Investor CTA */}
          <div style={{ textAlign: "center", padding: "36px 28px", background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.06))", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 18 }}>
            <div style={{ fontSize: 13, color: "#34d399", fontWeight: 600, marginBottom: 10 }}>
              {t("מעוניין להשקיע?", "Interested in investing?")}
            </div>
            <h3 style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 800, margin: "0 0 12px" }}>
              {t("צור קשר לקבלת Deck מלא + Due Diligence", "Contact us for full Deck + Due Diligence")}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "0 0 22px" }}>
              {t("BScale AI מגייסת Seed Round. נשמח לשתף נתונים, פייפליין ואסטרטגיה מלאה.", "BScale AI is raising a Seed Round. Happy to share data, pipeline, and full strategy.")}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="mailto:asher205@gmail.com"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#059669)", borderRadius: 10, padding: "12px 24px", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(16,185,129,0.35)" }}>
                ✉️ asher205@gmail.com
              </a>
              <a href="tel:0525640054"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 24px", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                📞 052-5640054
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section style={{ padding: "60px 16px", textAlign: "center" }}>
        <div className="lp-cta-box" style={{
          maxWidth: 640, margin: "0 auto",
          background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 22, padding: "60px 40px",
        }}>
          <h2 style={{ fontSize: "clamp(22px, 3.5vw, 40px)", fontWeight: 800, marginBottom: 14, margin: "0 0 14px" }}>{t("מוכן להתחיל?", "Ready to Start?")}</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(14px, 2vw, 17px)", marginBottom: 28 }}>
            {t("הצטרף לאלפי מפרסמים שכבר מגדילים את התשואה שלהם עם BScale AI", "Join thousands of advertisers already growing their returns with BScale AI")}
          </p>
          <button onClick={() => router.push("/login?mode=signup")}
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "15px 36px", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, boxShadow: "0 4px 30px rgba(99,102,241,0.45)", width: "100%", maxWidth: 360 }}>
            {t("התחל ניסיון חינם של 14 יום", "Start Your 14-Day Free Trial")}
          </button>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 14, margin: "14px 0 0" }}>
            {t("ללא כרטיס אשראי. ביטול בכל עת.", "No credit card required. Cancel anytime.")}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "36px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.65)" }}>BScale AI</span>
          </div>
          {/* Footer links */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            {navLinks.map(([id, label]) => (
              <a key={id} href={`#${id}`} style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textDecoration: "none" }}>{label}</a>
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, textAlign: "center", margin: 0 }}>
            © 2025 BScale AI · {t("פותח ע״י", "Developed by")} <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{t("אשר בוקשפן", "Asher Bukchapan")}</span> · <a href="tel:0525640054" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>052-5640054</a> · <a href="mailto:asher205@gmail.com" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>asher205@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
