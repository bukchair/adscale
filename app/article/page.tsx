"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SECTIONS = [
  {
    icon: "⚡",
    titleHe: "ארכיטקטורה בזמן אמת",
    titleEn: "Real-Time Architecture",
    bodyHe: `BScale AI בנויה על ארכיטקטורת event-driven המאפשרת עיבוד נתונים רציף ממספר מקורות בו-זמנית. כל אירוע — קליק, המרה, שינוי עלות — מעובד בתוך פחות מ-200ms ומוזן למודלי ה-AI לניתוח מיידי.

הנתונים מגיעים בזמן אמת מ-Google Ads API, Meta Marketing API, TikTok Ads API ו-WooCommerce/Shopify. Normalizer Layer מאחד את הפורמטים השונים לסכמה פנימית אחידה, שמאפשרת ל-AI לנתח בצורה עקבית ללא תלות בפלטפורמה.`,
    bodyEn: `BScale AI is built on an event-driven architecture that enables continuous data processing from multiple sources simultaneously. Every event — a click, conversion, or cost change — is processed within 200ms and fed into AI models for immediate analysis.

Data streams in real time from Google Ads API, Meta Marketing API, TikTok Ads API, and WooCommerce/Shopify. A Normalizer Layer unifies the different formats into a consistent internal schema, allowing the AI to analyze data uniformly regardless of platform.`,
  },
  {
    icon: "🧠",
    titleHe: "מנוע ה-AI — שכבות הניתוח",
    titleEn: "The AI Engine — Analysis Layers",
    bodyHe: `המערכת פועלת בשלוש שכבות:

1. **Anomaly Detection** — מזהה חריגות בנתוני ביצועים (ירידה פתאומית ב-CTR, עלייה חדה ב-CPC) ומתריע בזמן אמת.

2. **Budget Optimizer** — אלגוריתם Bayesian Optimization שמחלק תקציב בין ערוצים ובין קמפיינים על בסיס תחזית ROAS. עדכון כל 4 שעות.

3. **Creative Intelligence** — מודל שמנתח ביצועי מודעות קיימות (כותרות, תמונות, CTA) ומייצר וריאנטים חדשים בעזרת LLM, עם ניקוד אוטומטי לפני פרסום.`,
    bodyEn: `The system operates in three layers:

1. **Anomaly Detection** — identifies performance anomalies (sudden CTR drops, sharp CPC increases) and alerts in real time.

2. **Budget Optimizer** — a Bayesian Optimization algorithm that allocates budget across channels and campaigns based on ROAS forecasts. Updates every 4 hours.

3. **Creative Intelligence** — a model that analyzes existing ad performance (headlines, images, CTAs) and generates new variants using an LLM, with automatic scoring before publishing.`,
  },
  {
    icon: "🔗",
    titleHe: "אינטגרציות ופרוטוקולי API",
    titleEn: "Integrations & API Protocols",
    bodyHe: `כל אינטגרציה בנויה עם circuit-breaker מובנה שמגן מפני תקלות ב-API של צד שלישי. במידה וה-API מחזיר שגיאה, המערכת עוברת ל-cached data ומציינת זאת למשתמש בצורה שקופה.

אימות מבוסס OAuth 2.0 עם רענון אוטומטי של tokens. כל בקשה ל-API מוקלטת ב-audit log מלא לצרכי debugging ותאימות.

חיבור ל-Gmail מאפשר שליחת דוחות אוטומטיים ועדכונים ב-threshold — ללא צורך בשרת SMTP נפרד.`,
    bodyEn: `Every integration includes a built-in circuit-breaker that protects against third-party API failures. If an API returns an error, the system falls back to cached data and notifies the user transparently.

Authentication uses OAuth 2.0 with automatic token refresh. All API requests are logged in a full audit log for debugging and compliance.

The Gmail integration enables automatic report delivery and threshold alerts — with no separate SMTP server required.`,
  },
  {
    icon: "🔒",
    titleHe: "אבטחה ופרטיות",
    titleEn: "Security & Privacy",
    bodyHe: `כל הנתונים מוצפנים במנוחה (AES-256) ובמעבר (TLS 1.3). הרשאות מנוהלות ב-RBAC (Role-Based Access Control) עם תמיכה ב-multi-tenant מלא — כל לקוח רואה אך ורק את הנתונים שלו.

המערכת עומדת בתקני GDPR ו-CCPA. נתונים אישיים של משתמשי קצה אינם נשמרים — אנו עובדים רק עם אגרגטים סטטיסטיים מה-API.`,
    bodyEn: `All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Permissions are managed via RBAC (Role-Based Access Control) with full multi-tenant support — each customer sees only their own data.

The system complies with GDPR and CCPA standards. End-user personal data is never stored — we work exclusively with statistical aggregates from the API.`,
  },
  {
    icon: "📊",
    titleHe: "דוחות ו-BI — מתחת למכסה",
    titleEn: "Reports & BI — Under the Hood",
    bodyHe: `מנוע הדוחות בנוי על pipeline אסינכרוני: בקשת דוח מתורת ב-queue, מעובדת בצורה parallel על פני טווחי תאריכים מרובים, ומוחזרת למשתמש עם progress indicator בזמן אמת.

ייצוא לאקסל מנוהל על-ידי מנוע streaming שמאפשר קבצים גדולים ללא timeout. כל דוח כולל breakdown מלא לפי ערוץ, קמפיין ותאריך — עם highlighted אנומליות.`,
    bodyEn: `The reporting engine is built on an asynchronous pipeline: a report request is queued, processed in parallel across multiple date ranges, and returned to the user with a real-time progress indicator.

Excel export is handled by a streaming engine that supports large files without timeouts. Every report includes a full breakdown by channel, campaign, and date — with highlighted anomalies.`,
  },
];

export default function ArticlePage() {
  const router = useRouter();
  const [lang, setLang] = useState<"he" | "en">("he");
  const isHe = lang === "he";
  const t = (he: string, en: string) => (isHe ? he : en);

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      direction: isHe ? "rtl" : "ltr",
      background: "#0a0a14",
      color: "#fff",
      minHeight: "100vh",
    }}>
      {/* Top bar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(10,10,20,0.92)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0 20px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}
        >
          {isHe ? "→" : "←"} {t("חזרה לדף הבית", "Back to Home")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 16, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BScale AI</span>
        </div>
        <button
          onClick={() => setLang(l => l === "he" ? "en" : "he")}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 11px", color: "#fff", cursor: "pointer", fontSize: 12 }}
        >{isHe ? "EN" : "עב"}</button>
      </nav>

      {/* Article content */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "100px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 56, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#a5b4fc", marginBottom: 20, fontWeight: 600, letterSpacing: 0.5 }}>
            {t("מאמר טכנולוגיה", "Technology Deep-Dive")}
          </div>
          <h1 style={{ fontSize: "clamp(24px, 5vw, 44px)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 18px" }}>
            {t(
              "כיצד BScale AI מנתח מיליוני נקודות נתונים בזמן אמת",
              "How BScale AI Analyzes Millions of Data Points in Real Time"
            )}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(14px, 2vw, 17px)", lineHeight: 1.75, maxWidth: 580, margin: "0 auto" }}>
            {t(
              "מאחורי ממשק המשתמש החלק מסתתרת ארכיטקטורה מורכבת. במאמר זה נפרט את הטכנולוגיה שמאפשרת לנו לספק תוצאות בזמן אמת.",
              "Behind the smooth UI lies a complex architecture. In this article we detail the technology that enables us to deliver real-time results."
            )}
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {SECTIONS.map((sec, i) => (
            <section key={i}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {sec.icon}
                </div>
                <h2 style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 800, margin: 0 }}>
                  {t(sec.titleHe, sec.titleEn)}
                </h2>
              </div>
              {/* Body — render newlines as paragraphs */}
              <div style={{ borderInlineStart: "2px solid rgba(99,102,241,0.3)", paddingInlineStart: 20 }}>
                {t(sec.bodyHe, sec.bodyEn).split("\n\n").map((para, j) => (
                  <p key={j} style={{ color: "rgba(255,255,255,0.68)", fontSize: "clamp(14px, 1.8vw, 16px)", lineHeight: 1.85, margin: "0 0 16px" }}>
                    {para.split(/(\*\*[^*]+\*\*)/).map((chunk, k) =>
                      chunk.startsWith("**") && chunk.endsWith("**")
                        ? <strong key={k} style={{ color: "#e2e8f0" }}>{chunk.slice(2, -2)}</strong>
                        : chunk
                    )}
                  </p>
                ))}
              </div>
              {i < SECTIONS.length - 1 && (
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginTop: 8 }} />
              )}
            </section>
          ))}
        </div>

        {/* CTA at bottom */}
        <div style={{ marginTop: 72, textAlign: "center", background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 18, padding: "40px 32px" }}>
          <h3 style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800, margin: "0 0 14px" }}>
            {t("מוכן לראות את זה בפעולה?", "Ready to see it in action?")}
          </h3>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: "0 0 24px" }}>
            {t("הצטרף לניסיון חינמי של 14 יום — ללא כרטיס אשראי.", "Join a 14-day free trial — no credit card required.")}
          </p>
          <button
            onClick={() => router.push("/login?mode=signup")}
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "13px 32px", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700, boxShadow: "0 4px 24px rgba(99,102,241,0.4)" }}
          >
            {t("התחל בחינם", "Start Free")}
          </button>
        </div>
      </main>
    </div>
  );
}
