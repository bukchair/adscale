"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getUser, completeOnboarding, saveConnection, getConnections,
  removeConnection, clearConnections, isOnboardingComplete,
  setBusinessProfile, getBusinessProfile, saveSelectedPlan, type BusinessProfile,
} from "../lib/auth";

/* ── Types ──────────────────────────────────────────────────────── */
interface FieldDef {
  key: string;
  he: string;
  en: string;
  placeholder: string;
  type?: "password" | "text" | "url";
  hint?: string;
}

interface PlatformDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  desc: { he: string; en: string };
  fields: FieldDef[];
  oauthLabel?: { he: string; en: string };
}

interface WizardStep {
  id: string;
  title: { he: string; en: string };
  subtitle: { he: string; en: string };
  icon: string;
  platforms: PlatformDef[];
}

/* ── Platform definitions ───────────────────────────────────────── */
const STEPS: WizardStep[] = [
  {
    id: "ads", icon: "📣",
    title: { he: "פלטפורמות פרסום", en: "Ad Platforms" },
    subtitle: { he: "חבר את חשבונות הפרסום שלך לניהול וניתוח ממוקם אחד", en: "Connect your ad accounts for centralized management and analysis" },
    platforms: [
      {
        id: "google-ads", name: "Google Ads", icon: "🔵", color: "#4285f4", bg: "rgba(66,133,244,0.08)",
        desc: { he: "ניהול קמפיינים, מילות מפתח ומעקב המרות", en: "Manage campaigns, keywords and conversion tracking" },
        oauthLabel: { he: "חבר עם Google", en: "Connect with Google" },
        fields: [
          { key: "customerId", he: "מזהה לקוח", en: "Customer ID", placeholder: "123-456-7890", hint: "נמצא בפינה הימנית עליונה של Google Ads" },
          { key: "developerToken", he: "Developer Token", en: "Developer Token", placeholder: "ABcDeFgHiJkLmNoPq", type: "password" },
        ],
      },
      {
        id: "meta-ads", name: "Meta Ads", icon: "🔷", color: "#1877f2", bg: "rgba(24,119,242,0.08)",
        desc: { he: "פרסום ב-Facebook ו-Instagram עם טרגוט מדויק", en: "Advertise on Facebook & Instagram with precise targeting" },
        oauthLabel: { he: "חבר עם Facebook", en: "Connect with Facebook" },
        fields: [
          { key: "accessToken", he: "Access Token", en: "Access Token", placeholder: "EAAxxxxxx...", type: "password" },
          { key: "adAccountId", he: "מזהה חשבון מודעות", en: "Ad Account ID", placeholder: "act_123456789" },
        ],
      },
      {
        id: "tiktok-ads", name: "TikTok Ads", icon: "🎵", color: "#00f2ea", bg: "rgba(0,242,234,0.06)",
        desc: { he: "קמפיינים ב-TikTok לקהל צעיר ומעורב", en: "TikTok campaigns for young, engaged audiences" },
        fields: [
          { key: "accessToken", he: "Access Token", en: "Access Token", placeholder: "xxxxx...", type: "password" },
          { key: "advertiserId", he: "Advertiser ID", en: "Advertiser ID", placeholder: "7012345678901234567" },
        ],
      },
    ],
  },
  {
    id: "ecommerce", icon: "🛒",
    title: { he: "חנות מקוונת", en: "eCommerce Store" },
    subtitle: { he: "חבר את החנות שלך לסנכרון מוצרים, הזמנות והכנסות", en: "Connect your store to sync products, orders and revenue" },
    platforms: [
      {
        id: "woocommerce", name: "WooCommerce", icon: "🛍️", color: "#7f54b3", bg: "rgba(127,84,179,0.08)",
        desc: { he: "חנות WordPress/WooCommerce — סנכרון מוצרים ומכירות", en: "WordPress/WooCommerce store — sync products and sales" },
        fields: [
          { key: "storeUrl", he: "כתובת החנות", en: "Store URL", placeholder: "https://mystore.co.il", type: "url" },
          { key: "consumerKey", he: "Consumer Key", en: "Consumer Key", placeholder: "ck_xxxxxxxxxxxxxx", type: "password" },
          { key: "consumerSecret", he: "Consumer Secret", en: "Consumer Secret", placeholder: "cs_xxxxxxxxxxxxxx", type: "password" },
        ],
      },
      {
        id: "shopify", name: "Shopify", icon: "🟢", color: "#96bf48", bg: "rgba(150,191,72,0.07)",
        desc: { he: "חנות Shopify — סנכרון מוצרים, הזמנות וגרפים", en: "Shopify store — sync products, orders and analytics" },
        fields: [
          { key: "shopDomain", he: "דומיין החנות", en: "Shop Domain", placeholder: "mystore.myshopify.com", type: "url" },
          { key: "accessToken", he: "Admin API Token", en: "Admin API Token", placeholder: "shpat_xxxxxxxxxxxxxx", type: "password" },
        ],
      },
    ],
  },
  {
    id: "analytics", icon: "📊",
    title: { he: "Analytics & SEO", en: "Analytics & SEO" },
    subtitle: { he: "חבר כלי analytics לקבלת נתונים מלאים על ביצועי האתר", en: "Connect analytics tools for complete website performance data" },
    platforms: [
      {
        id: "ga4", name: "Google Analytics 4", icon: "📈", color: "#e37400", bg: "rgba(227,116,0,0.07)",
        desc: { he: "מעקב מבקרים, המרות ואירועים מ-GA4", en: "Track visitors, conversions and events from GA4" },
        oauthLabel: { he: "חבר עם Google", en: "Connect with Google" },
        fields: [
          { key: "measurementId", he: "Measurement ID", en: "Measurement ID", placeholder: "G-XXXXXXXXXX" },
          { key: "propertyId", he: "Property ID", en: "Property ID", placeholder: "123456789" },
        ],
      },
      {
        id: "gsc", name: "Google Search Console", icon: "🔍", color: "#34a853", bg: "rgba(52,168,83,0.07)",
        desc: { he: "נתוני חיפוש, קליקים וחשיפות מ-Google", en: "Search data, clicks and impressions from Google" },
        oauthLabel: { he: "חבר עם Google", en: "Connect with Google" },
        fields: [
          { key: "siteUrl", he: "כתובת האתר", en: "Site URL", placeholder: "https://mystore.co.il", type: "url" },
        ],
      },
    ],
  },
  {
    id: "ai", icon: "🤖",
    title: { he: "מנועי AI", en: "AI Engines" },
    subtitle: { he: "הוסף מפתחות API של OpenAI או Anthropic לכוח AI מלא בממשק", en: "Add OpenAI or Anthropic API keys to unlock full AI power in the platform" },
    platforms: [
      {
        id: "openai", name: "OpenAI", icon: "⚡", color: "#10a37f", bg: "rgba(16,163,127,0.07)",
        desc: { he: "GPT-4o ו-DALL·E 3 לתוכן ויצירת תמונות", en: "GPT-4o and DALL·E 3 for content and image generation" },
        fields: [
          { key: "apiKey", he: "API Key", en: "API Key", placeholder: "sk-proj-xxxxxxxxxxxxxxxxxxxxxx", type: "password", hint: "platform.openai.com/api-keys" },
        ],
      },
      {
        id: "anthropic", name: "Anthropic / Claude", icon: "🧠", color: "#b87333", bg: "rgba(184,115,51,0.07)",
        desc: { he: "Claude לניתוח, קופירייטינג ואסטרטגיה", en: "Claude for analysis, copywriting and strategy" },
        fields: [
          { key: "apiKey", he: "API Key", en: "API Key", placeholder: "sk-ant-api03-xxxxxxxxxxxxxx", type: "password", hint: "console.anthropic.com/settings/keys" },
        ],
      },
    ],
  },
];

const BUSINESS_TYPES = [
  { he: "חנות מקוונת",  en: "eCommerce" },
  { he: "לידים",         en: "Lead Generation" },
  { he: "שירותים",       en: "Services" },
  { he: "SaaS",          en: "SaaS" },
  { he: "אחר",           en: "Other" },
];
const INDUSTRIES = [
  { he: "אופנה וביגוד",    en: "Fashion & Apparel" },
  { he: "אלקטרוניקה",     en: "Electronics" },
  { he: "מזון ומשקאות",   en: "Food & Beverage" },
  { he: "יופי וקוסמטיקה", en: "Beauty & Cosmetics" },
  { he: "בית וגן",         en: "Home & Garden" },
  { he: "בריאות",          en: "Health & Wellness" },
  { he: "ספורט",           en: "Sports" },
  { he: "אחר",             en: "Other" },
];
const COUNTRIES = ["ישראל", "USA", "UK", "Germany", "France", "UAE", "Other"];
const CURRENCIES = ["ILS ₪", "USD $", "EUR €", "GBP £", "AED د.إ"];

/* ── Spinner ─────────────────────────────────────────────────────── */
const Spinner = () => (
  <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

/* ── Business Registration Step ─────────────────────────────────── */
function BusinessStep({ lang, onNext }: { lang: "he" | "en"; onNext: (data: BusinessProfile) => void }) {
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;
  const [form, setForm] = useState<BusinessProfile>({
    storeName: "", websiteUrl: "", ownerName: "", phone: "",
    businessType: "", industry: "", country: "ישראל", currency: "ILS ₪",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessProfile, boolean>>>({});

  const set = (k: keyof BusinessProfile, v: string) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e: Partial<Record<keyof BusinessProfile, boolean>> = {};
    if (!form.storeName.trim()) e.storeName = true;
    if (!form.ownerName.trim()) e.ownerName = true;
    if (!form.phone.trim()) e.phone = true;
    if (!form.businessType) e.businessType = true;
    if (!form.industry) e.industry = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (validate()) onNext(form);
  }

  const inputStyle = (err?: boolean): React.CSSProperties => ({
    width: "100%", background: "var(--lp-input-bg)",
    border: `1px solid ${err ? "rgba(239,68,68,0.6)" : "var(--lp-input-border)"}`,
    borderRadius: 10, padding: "11px 14px", color: "var(--lp-text)", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  });

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "var(--lp-text-muted)", marginBottom: 6 };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🏪</div>
        <div>
          <div style={{ fontSize: 11, color: "var(--lp-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("שלב 1 מתוך 5", "Step 1 of 5")}</div>
          <h1 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 900, color: "var(--lp-text)", margin: 0 }}>{t("פרטי העסק שלך", "Your Business Details")}</h1>
        </div>
      </div>
      <p style={{ color: "var(--lp-text-muted)", fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
        {t("הפרטים האלה יעזרו לנו להתאים את הממשק לעסק שלך ולהציג נתונים רלוונטיים", "These details help us tailor the platform to your business and display relevant data")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Row 1: Store name + owner */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("שם החנות / העסק *", "Store / Business Name *")}</label>
            <input value={form.storeName} onChange={e => set("storeName", e.target.value)} placeholder={t("My Store", "My Store")} style={inputStyle(errors.storeName)} />
          </div>
          <div>
            <label style={labelStyle}>{t("שם הבעלים *", "Owner Name *")}</label>
            <input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} placeholder={t("ישראל ישראלי", "John Smith")} style={inputStyle(errors.ownerName)} />
          </div>
        </div>

        {/* Row 2: Website + phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("כתובת אתר", "Website URL")}</label>
            <input type="url" value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} placeholder="https://mystore.co.il" style={inputStyle()} dir="ltr" />
          </div>
          <div>
            <label style={labelStyle}>{t("טלפון *", "Phone *")}</label>
            <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="052-0000000" style={inputStyle(errors.phone)} dir="ltr" />
          </div>
        </div>

        {/* Row 3: Business type */}
        <div>
          <label style={labelStyle}>{t("סוג עסק *", "Business Type *")}</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {BUSINESS_TYPES.map(bt => (
              <button key={bt.en} onClick={() => set("businessType", bt.en)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${form.businessType === bt.en ? "#6366f1" : "var(--lp-input-border)"}`, background: form.businessType === bt.en ? "rgba(99,102,241,0.2)" : "var(--lp-card-bg-subtle)", color: form.businessType === bt.en ? "#a5b4fc" : "var(--lp-text-muted)", cursor: "pointer", fontSize: 13, fontWeight: form.businessType === bt.en ? 700 : 400, transition: "all 0.15s" }}>
                {isHe ? bt.he : bt.en}
              </button>
            ))}
          </div>
          {errors.businessType && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{t("נא לבחור סוג עסק", "Please select a business type")}</div>}
        </div>

        {/* Row 4: Industry */}
        <div>
          <label style={labelStyle}>{t("תחום פעילות *", "Industry *")}</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {INDUSTRIES.map(ind => (
              <button key={ind.en} onClick={() => set("industry", ind.en)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${form.industry === ind.en ? "#8b5cf6" : "var(--lp-input-border)"}`, background: form.industry === ind.en ? "rgba(139,92,246,0.2)" : "var(--lp-card-bg-subtle)", color: form.industry === ind.en ? "#c4b5fd" : "var(--lp-text-muted)", cursor: "pointer", fontSize: 13, fontWeight: form.industry === ind.en ? 700 : 400, transition: "all 0.15s" }}>
                {isHe ? ind.he : ind.en}
              </button>
            ))}
          </div>
          {errors.industry && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{t("נא לבחור תחום", "Please select an industry")}</div>}
        </div>

        {/* Row 5: Country + currency */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("מדינה", "Country")}</label>
            <select value={form.country} onChange={e => set("country", e.target.value)} style={{ ...inputStyle(), appearance: "none" }}>
              {COUNTRIES.map(c => <option key={c} value={c} style={{ background: "var(--lp-bg)" }}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t("מטבע", "Currency")}</label>
            <select value={form.currency} onChange={e => set("currency", e.target.value)} style={{ ...inputStyle(), appearance: "none" }}>
              {CURRENCIES.map(c => <option key={c} value={c} style={{ background: "var(--lp-bg)" }}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} style={{ marginTop: 32, width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 14, padding: "16px 0", fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 4px 24px rgba(99,102,241,0.4)" }}>
        {t("המשך לחיבור פלטפורמות →", "Continue to Connect Platforms →")}
      </button>
    </div>
  );
}

/* ── Platform Card ───────────────────────────────────────────────── */
function PlatformCard({ platform, lang, connected, onConnect, onDisconnect }: {
  platform: PlatformDef; lang: "he" | "en"; connected: boolean;
  onConnect: (fields: Record<string, string>) => void; onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;
  const allFilled = platform.fields.every(f => values[f.key]?.trim());

  async function handleSave() {
    if (!allFilled) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    onConnect(values);
    setOpen(false);
  }

  async function handleOAuth() {
    setOauthLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setOauthLoading(false);
    onConnect({ oauth: "connected" });
  }

  return (
    <div style={{ background: connected ? "rgba(16,185,129,0.06)" : platform.bg, border: `1.5px solid ${connected ? "#10b981" : open ? platform.color + "55" : "var(--lp-card-border)"}`, borderRadius: 16, transition: "border-color 0.2s, background 0.2s", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, cursor: connected ? "default" : "pointer" }} onClick={() => !connected && setOpen(o => !o)}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: connected ? "rgba(16,185,129,0.15)" : platform.bg, border: `1px solid ${connected ? "#10b981" : "var(--lp-card-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{platform.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--lp-text)", marginBottom: 3 }}>{platform.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--lp-text-muted)", lineHeight: 1.4 }}>{t(platform.desc.he, platform.desc.en)}</div>
        </div>
        {connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid #10b98155", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#10b981", fontWeight: 700, whiteSpace: "nowrap" }}>✓ {t("מחובר", "Connected")}</div>
            <button onClick={e => { e.stopPropagation(); onDisconnect(); }} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#f87171", cursor: "pointer" }}>{t("נתק", "Disconnect")}</button>
          </div>
        ) : (
          <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} style={{ background: open ? platform.color : "var(--lp-card-bg-subtle)", border: `1px solid ${open ? platform.color : "var(--lp-input-border)"}`, borderRadius: 10, padding: "8px 18px", fontSize: 14, color: "var(--lp-text)", cursor: "pointer", fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {open ? t("סגור", "Close") : t("חבר", "Connect")}
          </button>
        )}
      </div>

      {open && !connected && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--lp-divider)" }}>
          <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {platform.oauthLabel && (
              <>
                <button onClick={handleOAuth} disabled={oauthLoading} style={{ width: "100%", background: "var(--lp-input-bg)", border: "1px solid var(--lp-input-border)", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, color: "var(--lp-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: oauthLoading ? 0.7 : 1 }}>
                  {oauthLoading ? <Spinner /> : <span>🔑</span>}
                  {t(platform.oauthLabel.he, platform.oauthLabel.en)}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--lp-divider)" }} />
                  <span style={{ color: "var(--lp-text-ultra-faint)", fontSize: 12 }}>{t("או הזן ידנית", "or enter manually")}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--lp-divider)" }} />
                </div>
              </>
            )}
            {platform.fields.map(f => (
              <div key={f.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <label style={{ fontSize: 12, color: "var(--lp-text-muted)" }}>{t(f.he, f.en)}</label>
                  {f.hint && <span style={{ fontSize: 11, color: "var(--lp-text-ultra-faint)" }}>{f.hint}</span>}
                </div>
                <input type={f.type || "text"} value={values[f.key] || ""} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", background: "var(--lp-input-bg)", border: "1px solid var(--lp-input-border)", borderRadius: 9, padding: "10px 13px", color: "var(--lp-text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} dir="ltr" />
              </div>
            ))}
            <button onClick={handleSave} disabled={saving || !allFilled} style={{ marginTop: 4, background: `linear-gradient(135deg,${platform.color},${platform.color}bb)`, border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (saving || !allFilled) ? 0.5 : 1, transition: "opacity 0.2s" }}>
              {saving ? <Spinner /> : null}
              {t("שמור וחבר", "Save & Connect")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Plan Selection Step ─────────────────────────────────────────── */
const ONBOARDING_PLANS = [
  {
    id: "free",
    nameHe: "חינמי", nameEn: "Free",
    price: "$0", color: "#10b981",
    badgeHe: "🚀 זמין בהשקה", badgeEn: "🚀 Launch Period",
    tagHe: "לתקופת ההשקה", tagEn: "During launch period",
    featuresHe: ["סקירה כללית + דשבורד", "חיבור עד 2 פלטפורמות", "המלצות AI בסיסיות", "דוחות שבועיים"],
    featuresEn: ["Overview + dashboard", "Connect up to 2 platforms", "Basic AI recommendations", "Weekly reports"],
  },
  {
    id: "pro",
    nameHe: "פרופשיונל", nameEn: "Professional",
    price: "$200", color: "#6366f1",
    tagHe: "למותגים וחנויות", tagEn: "For brands & stores",
    featuresHe: ["כל ערוצי הפרסום", "AI Creative Lab", "SEO & GEO מתקדם", "אוטומציה + דוחות", "תמיכה עדיפות"],
    featuresEn: ["All ad channels", "AI Creative Lab", "Advanced SEO & GEO", "Automation + reports", "Priority support"],
  },
  {
    id: "enterprise",
    nameHe: "אנטרפרייז", nameEn: "Enterprise",
    price: "$500", color: "#f59e0b",
    popularHe: "הכי פופולרי", popularEn: "Most Popular",
    tagHe: "לסוכנויות דיגיטל", tagEn: "For digital agencies",
    featuresHe: ["הכל ב-Professional", "ריבוי חנויות", "White-label", "CSM ייעודי", "SLA מובטח"],
    featuresEn: ["Everything in Professional", "Multi-store", "White-label", "Dedicated CSM", "Guaranteed SLA"],
  },
];

function PlanStep({ lang, onSelect }: { lang: "he" | "en"; onSelect: (planId: string) => void }) {
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 0 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>💎</div>
        <div>
          <div style={{ fontSize: 11, color: "var(--lp-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t("שלב אחרון", "Final Step")}</div>
          <h1 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 900, color: "var(--lp-text)", margin: 0 }}>{t("בחר תוכנית", "Choose Your Plan")}</h1>
        </div>
      </div>
      <p style={{ color: "var(--lp-text-muted)", fontSize: 14, marginBottom: 28 }}>
        {t("יש לבחור תוכנית כדי להמשיך. ניתן לשדרג או לשנות בכל עת.", "You must select a plan to continue. You can upgrade or change at any time.")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {ONBOARDING_PLANS.map(p => {
          const isSelected = selected === p.id;
          return (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              position: "relative", cursor: "pointer",
              background: isSelected ? `${p.color}15` : "var(--lp-card-bg)",
              border: `2px solid ${isSelected ? p.color : "var(--lp-card-border)"}`,
              borderRadius: 16, padding: "22px 18px",
              transition: "all 0.2s",
              boxShadow: isSelected ? `0 0 20px ${p.color}25` : "none",
            }}>
              {p.badgeHe && (
                <div style={{ position: "absolute", top: -11, insetInlineStart: 16, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {t(p.badgeHe, p.badgeEn!)}
                </div>
              )}
              {p.popularHe && (
                <div style={{ position: "absolute", top: -11, insetInlineStart: 16, background: `linear-gradient(135deg,${p.color},${p.color}bb)`, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {t(p.popularHe, p.popularEn!)}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--lp-text)" }}>{t(p.nameHe, p.nameEn)}</div>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSelected ? p.color : "var(--lp-card-border)"}`, background: isSelected ? p.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
              </div>
              <div style={{ fontSize: 12, color: p.color, fontWeight: 600, marginBottom: 10 }}>{t(p.tagHe, p.tagEn)}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: p.color, marginBottom: 12 }}>{p.price}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--lp-text-faint)" }}>{t(" / חודש", " / mo")}</span></div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {(isHe ? p.featuresHe : p.featuresEn).map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--lp-text-muted)" }}>
                    <span style={{ color: p.color, fontWeight: 700, flexShrink: 0, fontSize: 10 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        style={{
          width: "100%", borderRadius: 14, padding: "16px 0", fontSize: 17, fontWeight: 800, border: "none", cursor: selected ? "pointer" : "not-allowed",
          background: selected ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--lp-card-border)",
          color: selected ? "#fff" : "var(--lp-text-faint)",
          boxShadow: selected ? "0 4px 24px rgba(99,102,241,0.45)" : "none",
          transition: "all 0.2s",
        }}
      >
        {selected ? t("אישור ומעבר למערכת 🚀", "Confirm & Enter Dashboard 🚀") : t("יש לבחור תוכנית להמשך", "Select a plan to continue")}
      </button>
    </div>
  );
}

/* ── Main Onboarding Wizard ─────────────────────────────────────── */
// stepIdx: -1=welcome, 0=business, 1..4=platforms, 5=plan
export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUserState] = useState<{ name: string } | null>(null);
  const [lang, setLang] = useState<"he" | "en">("he");
  const [stepIdx, setStepIdx] = useState(-1);
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState(false);
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }
    if (isOnboardingComplete()) { router.replace("/modules"); return; }
    setUserState(u);
    // Restore existing business profile if any
    const bp = getBusinessProfile();
    if (bp?.storeName) setStepIdx(1); // skip to platforms if business already filled
    // Reset + restore connections
    clearConnections();
    const saved = getConnections();
    const status: Record<string, boolean> = {};
    Object.keys(saved).forEach(k => { status[k] = true; });
    setConnections(status);
  }, [router]);

  function handleBusinessNext(data: BusinessProfile) {
    setBusinessProfile(data);
    setStepIdx(1); // go to first platform step
  }

  function handleConnect(platformId: string, fields: Record<string, string>) {
    saveConnection(platformId, fields);
    setConnections(prev => ({ ...prev, [platformId]: true }));
  }

  function handleDisconnect(platformId: string) {
    removeConnection(platformId);
    setConnections(prev => { const n = { ...prev }; delete n[platformId]; return n; });
  }

  function goNext() {
    // stepIdx 1..4 map to STEPS[0..3]; stepIdx===STEPS.length goes to plan step
    if (stepIdx <= STEPS.length) setStepIdx(i => i + 1);
    else finish();
  }

  function handleSkipStep() { goNext(); }

  async function handlePlanSelect(planId: string) {
    saveSelectedPlan(planId);
    await finish();
  }

  async function finish() {
    setFinishing(true);
    completeOnboarding();
    await new Promise(r => setTimeout(r, 600));
    router.replace("/modules");
  }

  const connectedCount = Object.keys(connections).length;
  const totalPlatforms = STEPS.reduce((acc, s) => acc + s.platforms.length, 0);

  // ── Welcome screen ──
  if (stepIdx === -1) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--lp-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, direction: isHe ? "rtl" : "ltr" }}>
        <div style={{ position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center", position: "relative" }}>
          <button onClick={() => setLang(l => l === "he" ? "en" : "he")} style={{ position: "absolute", top: -40, insetInlineEnd: 0, background: "var(--lp-card-bg-subtle)", border: "1px solid var(--lp-card-border)", borderRadius: 8, padding: "5px 12px", color: "var(--lp-text-muted)", cursor: "pointer", fontSize: 13 }}>
            {isHe ? "EN" : "עב"}
          </button>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 28px", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>⚡</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 900, color: "var(--lp-text)", marginBottom: 12, lineHeight: 1.2 }}>
            {t(`ברוך הבא, ${user?.name?.split(" ")[0] || ""}! 🎉`, `Welcome, ${user?.name?.split(" ")[0] || ""}! 🎉`)}
          </h1>
          <p style={{ fontSize: 17, color: "var(--lp-text-muted)", lineHeight: 1.7, marginBottom: 36 }}>
            {t("כמה שלבים קצרים להגדרת הממשק שלך. תוכל לדלג על כל שלב ולחזור אליו בכל עת.", "A few quick steps to set up your platform. You can skip any step and return to it at any time.")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 36 }}>
            {[
              { icon: "🏪", he: "פרטי העסק", en: "Business Details", sub: t("שם, אתר, תחום", "Name, website, industry") },
              { icon: "📣", he: "פלטפורמות פרסום", en: "Ad Platforms", sub: t("Google, Meta, TikTok", "Google, Meta, TikTok") },
              { icon: "🛒", he: "חנות מקוונת", en: "eCommerce Store", sub: t("WooCommerce, Shopify", "WooCommerce, Shopify") },
              { icon: "🤖", he: "Analytics & AI", en: "Analytics & AI", sub: t("GA4, GSC, OpenAI", "GA4, GSC, OpenAI") },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--lp-card-bg)", border: "1px solid var(--lp-card-border)", borderRadius: 14, padding: "16px 18px", textAlign: isHe ? "right" : "left", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--lp-text)" }}>{t(s.he, s.en)}</div>
                  <div style={{ fontSize: 11, color: "var(--lp-text-faint)", marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setStepIdx(0)} style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 14, padding: "16px 0", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 4px 24px rgba(99,102,241,0.45)", marginBottom: 16 }}>
            {t("בוא נתחיל! →", "Let's get started! →")}
          </button>
          <button onClick={() => setStepIdx(STEPS.length + 1)} style={{ width: "100%", background: "transparent", border: "none", color: "var(--lp-text-faint)", fontSize: 14, cursor: "pointer", padding: "8px 0" }}>
            {t("דלג על הכל — בחירת תוכנית →", "Skip all — choose a plan →")}
          </button>
        </div>
      </div>
    );
  }

  // ── Finishing screen ──
  if (finishing) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--lp-bg)", display: "flex", alignItems: "center", justifyContent: "center", direction: isHe ? "rtl" : "ltr" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🚀</div>
          <h2 style={{ color: "var(--lp-text)", fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{t("נכנסים לממשק...", "Loading dashboard...")}</h2>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  // ── Business step (stepIdx === 0) ──
  if (stepIdx === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--lp-bg)", direction: isHe ? "rtl" : "ltr" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--lp-nav-bg)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--lp-divider)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--lp-text)" }}>BScale AI</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ width: i === 0 ? 28 : 8, height: 8, borderRadius: 4, background: i === 0 ? "#6366f1" : "var(--lp-text-ultra-faint)", transition: "all 0.3s" }} />
            ))}
          </div>
          <button onClick={() => setLang(l => l === "he" ? "en" : "he")} style={{ background: "var(--lp-card-bg-subtle)", border: "1px solid var(--lp-card-border)", borderRadius: 7, padding: "4px 10px", color: "var(--lp-text-muted)", cursor: "pointer", fontSize: 12 }}>
            {isHe ? "EN" : "עב"}
          </button>
        </div>
        <div style={{ height: 3, background: "var(--lp-divider)" }}>
          <div style={{ height: "100%", width: "20%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", transition: "width 0.4s ease" }} />
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 40px" }}>
          <BusinessStep lang={lang} onNext={handleBusinessNext} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Platform steps (stepIdx 1..4 → STEPS[0..3]) ──
  const platformStepIdx = stepIdx - 1; // 0-based index into STEPS
  const step = STEPS[platformStepIdx];
  const totalSteps = STEPS.length + 2; // business + 4 platform steps + plan
  const stepConnectedCount = step?.platforms.filter(p => connections[p.id]).length ?? 0;

  // ── Plan selection step (stepIdx === STEPS.length + 1) ──
  if (stepIdx === STEPS.length + 1) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--lp-bg)", direction: isHe ? "rtl" : "ltr" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--lp-nav-bg)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--lp-divider)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--lp-text)" }}>BScale AI</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ width: i === stepIdx - 1 ? 28 : 8, height: 8, borderRadius: 4, background: i < stepIdx - 1 ? "#10b981" : i === stepIdx - 1 ? "#6366f1" : "var(--lp-text-tiny)", transition: "all 0.3s" }} />
            ))}
          </div>
          <button onClick={() => setLang(l => l === "he" ? "en" : "he")} style={{ background: "var(--lp-card-bg-subtle)", border: "1px solid var(--lp-card-border)", borderRadius: 7, padding: "4px 10px", color: "var(--lp-text-muted)", cursor: "pointer", fontSize: 12 }}>
            {isHe ? "EN" : "עב"}
          </button>
        </div>
        <div style={{ height: 3, background: "var(--lp-divider)" }}>
          <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", transition: "width 0.4s ease" }} />
        </div>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 60px" }}>
          <PlanStep lang={lang} onSelect={handlePlanSelect} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!step) {
    // Past all platform steps → go to plan step
    setStepIdx(STEPS.length + 1);
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--lp-bg)", direction: isHe ? "rtl" : "ltr" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--lp-nav-bg)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--lp-divider)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "var(--lp-text)" }}>BScale AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: i === stepIdx ? 28 : 8, height: 8, borderRadius: 4, background: i < stepIdx ? "#10b981" : i === stepIdx ? "#6366f1" : "var(--lp-text-ultra-faint)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--lp-text-faint)" }}>{t(`שלב ${stepIdx + 1} מתוך ${totalSteps}`, `Step ${stepIdx + 1} of ${totalSteps}`)}</span>
          <button onClick={() => setLang(l => l === "he" ? "en" : "he")} style={{ background: "var(--lp-card-bg-subtle)", border: "1px solid var(--lp-card-border)", borderRadius: 7, padding: "4px 10px", color: "var(--lp-text-muted)", cursor: "pointer", fontSize: 12 }}>
            {isHe ? "EN" : "עב"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--lp-divider)" }}>
        <div style={{ height: "100%", width: `${(stepIdx / totalSteps) * 100}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", transition: "width 0.4s ease" }} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 140px" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{step.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "var(--lp-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t(`שלב ${stepIdx + 1} מתוך ${totalSteps}`, `Step ${stepIdx + 1} of ${totalSteps}`)}</div>
              <h1 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 900, color: "var(--lp-text)", margin: 0 }}>{t(step.title.he, step.title.en)}</h1>
            </div>
          </div>
          <p style={{ fontSize: 15, color: "var(--lp-text-muted)", margin: "0 0 0 66px", lineHeight: 1.6 }}>{t(step.subtitle.he, step.subtitle.en)}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {step.platforms.map(platform => (
            <PlatformCard key={platform.id} platform={platform} lang={lang} connected={!!connections[platform.id]} onConnect={fields => handleConnect(platform.id, fields)} onDisconnect={() => handleDisconnect(platform.id)} />
          ))}
        </div>

        {stepConnectedCount > 0 && (
          <div style={{ marginTop: 20, textAlign: "center", color: "#10b981", fontSize: 14 }}>
            ✓ {stepConnectedCount} {t("מתוך", "of")} {step.platforms.length} {t("פלטפורמות מחוברות", "platforms connected")}
          </div>
        )}
      </div>

      {/* Sticky bottom */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--lp-nav-bg)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--lp-divider)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setStepIdx(i => i - 1)} style={{ background: "transparent", border: "1px solid var(--lp-input-border)", borderRadius: 10, padding: "11px 20px", color: "var(--lp-text-muted)", fontSize: 14, cursor: "pointer" }}>
              ← {t("חזור", "Back")}
            </button>
            <button onClick={handleSkipStep} style={{ background: "transparent", border: "none", color: "var(--lp-text-faint)", fontSize: 14, cursor: "pointer", padding: "11px 4px" }}>
              {t("דלג על שלב זה", "Skip this step")}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {connectedCount > 0 && <span style={{ fontSize: 13, color: "#10b981" }}>✓ {connectedCount}/{totalPlatforms} {t("מחוברים", "connected")}</span>}
            <button onClick={goNext} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "13px 32px", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", whiteSpace: "nowrap" }}>
              {stepIdx >= STEPS.length ? t("סיים וכנס לממשק 🚀", "Finish & Enter Dashboard 🚀") : t("המשך →", "Continue →")}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
