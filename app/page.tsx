"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isOnboardingComplete } from "./lib/auth";

const FEATURES = [
  { icon: "🎯", title: "ניהול קמפיינים חכם", titleEn: "Smart Campaign Management", desc: "מנוע AI שמנתח את הנתונים שלך ומייעל תקציבים בזמן אמת לרווחיות מקסימלית", descEn: "AI engine analyzes your data and optimizes budgets in real-time for maximum profitability" },
  { icon: "✍️", title: "Creative Lab עם AI", titleEn: "AI-Powered Creative Lab", desc: "יצירת מודעות טקסט ותמונה אוטומטית עם חיבור ישיר לפרסום ב-Meta, Google ו-TikTok", descEn: "Auto-generate text and image ads with direct publishing to Meta, Google, and TikTok" },
  { icon: "🔍", title: "SEO & GEO מתקדם", titleEn: "Advanced SEO & GEO", desc: "ניתוח AI לאופטימיזציית תוכן, Schema markup וסקירת נראות ב-AI Overviews של Google", descEn: "AI analysis for content optimization, Schema markup, and visibility in Google AI Overviews" },
  { icon: "👥", title: "ניהול קהלים חכם", titleEn: "Smart Audience Management", desc: "סנכרון קהלים, lookalike audiences וניתוח חפיפות בין Google, Meta ו-TikTok", descEn: "Sync audiences, create lookalikes, and analyze overlaps across Google, Meta, and TikTok" },
  { icon: "📊", title: "דוחות רווחיות", titleEn: "Profitability Reports", desc: "מעקב ROAS, CPA ורווח נקי בכל המדיות עם סינון לפי מוצר, קמפיין וקהל", descEn: "Track ROAS, CPA, and net profit across all channels filtered by product, campaign, and audience" },
  { icon: "🤖", title: "אוטומציה מבוססת כללים", titleEn: "Rule-Based Automation", desc: "הגדר כללים חכמים שמגיבים לנתוני ביצועים בזמן אמת — ללא התערבות ידנית", descEn: "Set smart rules that react to real-time performance data — no manual intervention needed" },
  { icon: "🛒", title: "אינטגרציה מלאה", titleEn: "Full Integration", desc: "התחבר ל-WooCommerce, Shopify, GA4, GSC וכל פלטפורמות הפרסום בהגדרה של דקות", descEn: "Connect to WooCommerce, Shopify, GA4, GSC, and all ad platforms in minutes" },
  { icon: "🛡️", title: "הרשאות וניהול צוות", titleEn: "Permissions & Team Management", desc: "מערכת הרשאות גמישה עם תפקידים: Admin, Manager, Editor ו-Viewer", descEn: "Flexible permission system with roles: Admin, Manager, Editor, and Viewer" },
];

const STEPS = [
  { num: "01", title: "התחבר את הפלטפורמות", titleEn: "Connect Your Platforms", desc: "חבר את חשבונות הפרסום, החנות ו-Analytics שלך בכמה קליקים", descEn: "Connect your ad accounts, store, and analytics in a few clicks" },
  { num: "02", title: "ה-AI מנתח ולומד", titleEn: "AI Analyzes & Learns", desc: "המערכת סורקת את הנתונים ההיסטוריים שלך ומזהה הזדמנויות שיפור", descEn: "The system scans your historical data and identifies improvement opportunities" },
  { num: "03", title: "צמח עם המלצות חכמות", titleEn: "Grow with Smart Recommendations", desc: "קבל המלצות בזמן אמת, יישם בלחיצה אחת וצפה בתוצאות מיידיות", descEn: "Get real-time recommendations, apply with one click, and watch results improve immediately" },
];

const PLANS = [
  { name: "Starter", nameHe: "סטארטר", price: "$49", period: "/ חודש", color: "#6366f1", features: ["עד 3 ערוצי פרסום", "AI Creative Lab", "דוחות בסיסיים", "תמיכה באימייל"], featuresEn: ["Up to 3 ad channels", "AI Creative Lab", "Basic reports", "Email support"] },
  { name: "Growth", nameHe: "גדילה", price: "$149", period: "/ חודש", color: "#10b981", popular: true, features: ["ערוצים ללא הגבלה", "SEO & GEO מתקדם", "אוטומציה", "ניהול קהלים", "תמיכה עדיפות"], featuresEn: ["Unlimited channels", "Advanced SEO & GEO", "Automation", "Audience management", "Priority support"] },
  { name: "Scale", nameHe: "סקייל", price: "$349", period: "/ חודש", color: "#8b5cf6", features: ["הכל ב-Growth", "Multi-account", "API גישה", "CSM ייעודי", "SLA מובטח"], featuresEn: ["Everything in Growth", "Multi-account", "API access", "Dedicated CSM", "Guaranteed SLA"] },
];

const STATS = [
  { value: "340%", label: "ROAS ממוצע", labelEn: "Average ROAS" },
  { value: "68%", label: "חיסכון בזמן", labelEn: "Time saved" },
  { value: "2.4x", label: "יותר המרות", labelEn: "More conversions" },
  { value: "12K+", label: "קמפיינים אוטומטיים", labelEn: "Automated campaigns" },
];

export default function LandingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"he" | "en">("he");
  const [menuOpen, setMenuOpen] = useState(false);
  const isHe = lang === "he";

  useEffect(() => {
    const user = getUser();
    if (user) router.replace(isOnboardingComplete() ? "/modules" : "/onboarding");
  }, [router]);

  const t = (he: string, en: string) => isHe ? he : en;

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", direction: isHe ? "rtl" : "ltr", background: "#0a0a14", color: "#fff", minHeight: "100vh" }}>
      {/* NAVBAR */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 20, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AdScale AI</span>
        </div>
        {/* Desktop nav */}
        <div className="as-desktop-only" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[["features", t("יכולות","Features")], ["how", t("איך זה עובד","How it works")], ["pricing", t("תמחור","Pricing")]].map(([id, label]) => (
            <a key={id} href={`#${id}`} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 15, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}>{label}</a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setLang(l => l === "he" ? "en" : "he")} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 12px", color: "#fff", cursor: "pointer", fontSize: 13 }}>
            {isHe ? "EN" : "עב"}
          </button>
          <button onClick={() => router.push("/login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 18px", color: "#fff", cursor: "pointer", fontSize: 14 }}>
            {t("כניסה", "Login")}
          </button>
          <button onClick={() => router.push("/login?mode=signup")} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {t("התחל בחינם", "Start Free")}
          </button>
          {/* Mobile hamburger */}
          <button className="as-mobile-only" onClick={() => setMenuOpen(m => !m)} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", marginInlineStart: 4 }}>☰</button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 99, background: "rgba(10,10,20,0.97)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {[["features", t("יכולות","Features")], ["how", t("איך זה עובד","How it works")], ["pricing", t("תמחור","Pricing")]].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 16 }}>{label}</a>
          ))}
        </div>
      )}

      {/* HERO */}
      <section style={{ paddingTop: 140, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "#a5b4fc", marginBottom: 24 }}>
            🚀 {t("הפלטפורמה מספר 1 לניהול פרסום עם AI", "The #1 AI-powered advertising management platform")}
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: -1 }}>
            {t("נהל את הפרסום שלך", "Manage Your Advertising")}
            <br />
            <span style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("עם כוח של AI", "With the Power of AI")}
            </span>
          </h1>
          <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "rgba(255,255,255,0.6)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>
            {t(
              "חסוך שעות של עבודה ידנית. AdScale AI מנתחת את הנתונים שלך, מייעלת תקציבים, יוצרת קריאייטיב ומגדילה את ה-ROAS שלך באופן אוטומטי.",
              "Save hours of manual work. AdScale AI analyzes your data, optimizes budgets, creates creatives, and automatically grows your ROAS."
            )}
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/login?mode=signup")} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "16px 36px", color: "#fff", cursor: "pointer", fontSize: 17, fontWeight: 700, boxShadow: "0 4px 30px rgba(99,102,241,0.4)" }}>
              {t("התחל בחינם — 14 יום ניסיון", "Start Free — 14 Day Trial")}
            </button>
            <button onClick={() => router.push("/modules")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "16px 36px", color: "#fff", cursor: "pointer", fontSize: 17 }}>
              {t("צפה בהדגמה חיה", "View Live Demo")}
            </button>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div style={{ maxWidth: 900, margin: "60px auto 0", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#a5b4fc" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{t(s.label, s.labelEn)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 70 }}>
                {[40,65,50,80,60,90,75,95,70,85].map((h, i) => (
                  <div key={i} style={{ width: 20, height: `${h}%`, background: i === 9 ? "linear-gradient(180deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.3)", borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16 }}>
              {[{ label: "Google Ads", pct: 72, color: "#4285f4" }, { label: "Meta Ads", pct: 58, color: "#1877f2" }, { label: "TikTok", pct: 84, color: "#00f2ea" }].map((p, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                    <span>{p.label}</span><span>{p.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                    <div style={{ width: `${p.pct}%`, height: "100%", background: p.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section style={{ background: "rgba(99,102,241,0.06)", borderTop: "1px solid rgba(99,102,241,0.15)", borderBottom: "1px solid rgba(99,102,241,0.15)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, textAlign: "center" }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 42, fontWeight: 900, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 6 }}>{t(s.label, s.labelEn)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, marginBottom: 16 }}>{t("כל מה שאתה צריך", "Everything You Need")}</h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 17, maxWidth: 540, margin: "0 auto" }}>{t("פלטפורמה שלמה לניהול, אופטימיזציה ויצירה של פרסום דיגיטלי", "A complete platform for managing, optimizing, and creating digital advertising")}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24, transition: "border-color 0.2s, background 0.2s", cursor: "default" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.4)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#e2e8f0" }}>{t(f.title, f.titleEn)}</h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{t(f.desc, f.descEn)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "80px 24px", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, marginBottom: 16 }}>{t("איך זה עובד?", "How Does It Work?")}</h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 17, marginBottom: 56 }}>{t("שלושה צעדים פשוטים להתחלה", "Three simple steps to get started")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "0 16px" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, margin: "0 auto 20px", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>{s.num}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{t(s.title, s.titleEn)}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>{t(s.desc, s.descEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, marginBottom: 16 }}>{t("מחירים שקופים", "Transparent Pricing")}</h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 17 }}>{t("ללא עמלות נסתרות. ביטול בכל עת.", "No hidden fees. Cancel anytime.")}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          {PLANS.map((p, i) => (
            <div key={i} style={{ position: "relative", background: p.popular ? `rgba(${p.color === "#10b981" ? "16,185,129" : "99,102,241"},0.08)` : "rgba(255,255,255,0.03)", border: `1px solid ${p.popular ? p.color : "rgba(255,255,255,0.08)"}`, borderRadius: 20, padding: "32px 28px", boxShadow: p.popular ? `0 0 40px rgba(16,185,129,0.12)` : "none" }}>
              {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "#fff", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{t("הכי פופולרי","Most Popular")}</div>}
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{t(p.nameHe, p.name)}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: p.color, marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>{p.period}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                {(isHe ? p.features : p.featuresEn).map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                    <span style={{ color: p.color, fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push("/login?mode=signup")} style={{ width: "100%", background: p.popular ? `linear-gradient(135deg,${p.color},${p.color}dd)` : "rgba(255,255,255,0.06)", border: p.popular ? "none" : "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 0", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
                {t("התחל עכשיו","Get Started")}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 24, padding: "60px 40px" }}>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, marginBottom: 16 }}>{t("מוכן להתחיל?", "Ready to Start?")}</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 17, marginBottom: 32 }}>{t("הצטרף לאלפי מפרסמים שכבר מגדילים את התשואה שלהם עם AdScale AI", "Join thousands of advertisers already growing their returns with AdScale AI")}</p>
          <button onClick={() => router.push("/login?mode=signup")} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "16px 40px", color: "#fff", cursor: "pointer", fontSize: 17, fontWeight: 700, boxShadow: "0 4px 30px rgba(99,102,241,0.5)" }}>
            {t("התחל ניסיון חינם של 14 יום", "Start Your 14-Day Free Trial")}
          </button>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 16 }}>{t("ללא כרטיס אשראי. ביטול בכל עת.", "No credit card required. Cancel anytime.")}</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "rgba(255,255,255,0.7)" }}>AdScale AI</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>© 2025 AdScale AI. {t("כל הזכויות שמורות לאשר בוקשפן", "All rights reserved to Asher Bukchapan")} | 052-5640054</p>
      </footer>
    </div>
  );
}
