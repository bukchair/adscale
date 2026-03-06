"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard, getToday, getDaysAgo, Campaign } from "@/hooks/useDashboard";

// ── Types for Ad Creator ────────────────────────────────────────────────────
interface WooProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: { id: number; name: string }[];
  images: { src: string; alt: string }[];
  stock_status: string;
  permalink?: string;
}
interface AdVariation {
  headline: string;
  description: string;
  cta: string;
  emoji: string;
}

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
const platformLabels: Record<string, Record<string, string>> = {
  he: { google: "Google Ads", meta: "Meta Ads", tiktok: "TikTok Ads" },
  en: { google: "Google Ads", meta: "Meta Ads", tiktok: "TikTok Ads" },
};
const statusColor: Record<string, string> = { active: "#00d4aa", paused: "#f5a623", draft: "#64748b" };
const statusLabel: Record<string, Record<string, string>> = {
  he: { active: "פעיל", paused: "מושהה", draft: "טיוטה" },
  en: { active: "Active", paused: "Paused", draft: "Draft" },
};

function getTabs(lang: "he" | "en") {
  return lang === "he" ? [
    { label: "דשבורד", icon: "📊" },
    { label: "קמפיינים", icon: "🚀" },
    { label: "AI אופטימיזציה", icon: "🤖" },
    { label: "קהלים", icon: "👥" },
    { label: "מילות שליליות", icon: "🚫" },
    { label: "מחולל מודעות", icon: "🎨" },
    { label: "הגדרות", icon: "⚙️" },
  ] : [
    { label: "Dashboard", icon: "📊" },
    { label: "Campaigns", icon: "🚀" },
    { label: "AI Optimization", icon: "🤖" },
    { label: "Audiences", icon: "👥" },
    { label: "Negative Keywords", icon: "🚫" },
    { label: "Ad Creator", icon: "🎨" },
    { label: "Settings", icon: "⚙️" },
  ];
}

const AI_SUGGESTIONS_HE = [
  { id: 1, platform: "google", impact: "+18% ROAS", message: "העלה תקציב לקמפיין המוביל ב-20% – ביקוש גבוה צפוי", priority: "high" },
  { id: 2, platform: "meta",   impact: "+12% CTR",  message: "הרחב קהל יעד ל-Lookalike 3%", priority: "medium" },
  { id: 3, platform: "tiktok", impact: "+25% CVR",  message: "החלף קריאייטיב ב-Retargeting – CTR ירד ב-40% בשבוע האחרון", priority: "high" },
  { id: 4, platform: "google", impact: "-8% CPA",   message: "עבור ל-Target CPA של 42 – AI זיהה דפוסי המרה חדשים", priority: "low" },
];
const AI_SUGGESTIONS_EN = [
  { id: 1, platform: "google", impact: "+18% ROAS", message: "Increase budget for top campaign by 20% – high demand expected", priority: "high" },
  { id: 2, platform: "meta",   impact: "+12% CTR",  message: "Expand audience to Lookalike 3%", priority: "medium" },
  { id: 3, platform: "tiktok", impact: "+25% CVR",  message: "Replace Retargeting creative – CTR dropped 40% this week", priority: "high" },
  { id: 4, platform: "google", impact: "-8% CPA",   message: "Switch to Target CPA of 42 – AI detected new conversion patterns", priority: "low" },
];

const DATE_PRESETS_HE = [
  { label: "7 ימים", from: () => getDaysAgo(7) },
  { label: "14 ימים", from: () => getDaysAgo(14) },
  { label: "30 ימים", from: () => getDaysAgo(30) },
];
const DATE_PRESETS_EN = [
  { label: "7 days", from: () => getDaysAgo(7) },
  { label: "14 days", from: () => getDaysAgo(14) },
  { label: "30 days", from: () => getDaysAgo(30) },
];

// ── Integration definitions ────────────────────────────────────────────────
interface IntegrationField { key: string; label: string; placeholder: string; hint?: string; secret?: boolean; }
interface IntegrationDef {
  id: string; name: string; detail: string; iconType: string; envKey: string;
  oauthProvider: "google" | "meta" | "tiktok" | null; oauthLabel: string | null;
  oauthScopes?: string; fields: IntegrationField[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "google_ads", name: "Google Ads", detail: "Shopping, Display, חיפוש",
    iconType: "google", envKey: "GOOGLE_ADS_CUSTOMER_ID",
    oauthProvider: "google", oauthLabel: "Google",
    oauthScopes: "https://www.googleapis.com/auth/adwords",
    fields: [
      { key: "customer_id", label: "Customer ID", placeholder: "123-456-7890", hint: "מספר חשבון ב-Google Ads" },
      { key: "developer_token", label: "Developer Token", placeholder: "ABcd1234...", secret: true },
      { key: "client_id", label: "OAuth Client ID", placeholder: "1234.apps.googleusercontent.com" },
      { key: "client_secret", label: "OAuth Client Secret", placeholder: "GOCSPX-...", secret: true },
      { key: "access_token", label: "Access Token", placeholder: "ya29.a0A...", secret: true, hint: "לאחר OAuth — מאפשר פרסום ישיר" },
      { key: "campaign_id", label: "Campaign ID (אופציונלי)", placeholder: "123456789", hint: "אם ריק — תיפתח קמפיין חדשה" },
      { key: "ad_group_id", label: "Ad Group ID (אופציונלי)", placeholder: "123456789" },
    ],
  },
  {
    id: "woocommerce", name: "WooCommerce", detail: "חנות איקומרס",
    iconType: "woo", envKey: "WOOCOMMERCE_URL",
    oauthProvider: null, oauthLabel: null,
    fields: [
      { key: "url", label: "כתובת החנות", placeholder: "https://mystore.co.il" },
      { key: "consumer_key", label: "Consumer Key", placeholder: "ck_..." },
      { key: "consumer_secret", label: "Consumer Secret", placeholder: "cs_...", secret: true },
    ],
  },
  {
    id: "meta", name: "Meta Business", detail: "Facebook + Instagram",
    iconType: "meta", envKey: "META_AD_ACCOUNT_ID",
    oauthProvider: "meta", oauthLabel: "Facebook",
    fields: [
      { key: "account_id", label: "Ad Account ID", placeholder: "act_123456789", hint: "מספר חשבון פרסום" },
      { key: "app_id", label: "App ID", placeholder: "123456789" },
      { key: "app_secret", label: "App Secret", placeholder: "...", secret: true },
      { key: "access_token", label: "Access Token", placeholder: "EAABwzLix...", secret: true, hint: "לאחר OAuth — מאפשר פרסום ישיר" },
      { key: "page_id", label: "Facebook Page ID", placeholder: "123456789", hint: "נדרש לפרסום" },
    ],
  },
  {
    id: "tiktok", name: "TikTok Ads", detail: "TikTok For Business",
    iconType: "tiktok", envKey: "TIKTOK_ADVERTISER_ID",
    oauthProvider: "tiktok", oauthLabel: "TikTok",
    fields: [
      { key: "advertiser_id", label: "Advertiser ID", placeholder: "1234567890" },
      { key: "app_id", label: "App ID", placeholder: "...", hint: "מ-TikTok Business Center" },
      { key: "app_secret", label: "App Secret", placeholder: "...", secret: true },
      { key: "access_token", label: "Access Token", placeholder: "att_...", secret: true, hint: "לאחר OAuth — מאפשר פרסום ישיר" },
    ],
  },
  {
    id: "ga4", name: "Google Analytics 4", detail: "נתוני המרה",
    iconType: "google", envKey: "GA4_PROPERTY_ID",
    oauthProvider: "google", oauthLabel: "Google",
    oauthScopes: "https://www.googleapis.com/auth/analytics.readonly",
    fields: [
      { key: "property_id", label: "Property ID", placeholder: "123456789", hint: "Admin → Property" },
      { key: "client_id", label: "OAuth Client ID", placeholder: "1234.apps.googleusercontent.com" },
      { key: "client_secret", label: "OAuth Client Secret", placeholder: "GOCSPX-...", secret: true },
    ],
  },
  {
    id: "gmc", name: "Google Merchant Center", detail: "פיד מוצרים",
    iconType: "google", envKey: "GMC_MERCHANT_ID",
    oauthProvider: "google", oauthLabel: "Google",
    oauthScopes: "https://www.googleapis.com/auth/content",
    fields: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "123456789" },
      { key: "client_id", label: "OAuth Client ID", placeholder: "1234.apps.googleusercontent.com" },
      { key: "client_secret", label: "OAuth Client Secret", placeholder: "GOCSPX-...", secret: true },
    ],
  },
  {
    id: "anthropic", name: "Anthropic Claude", detail: "יצירת טקסט מודעות AI",
    iconType: "anthropic", envKey: "ANTHROPIC_API_KEY",
    oauthProvider: null, oauthLabel: null,
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-ant-api03-...", secret: true, hint: "console.anthropic.com/settings/keys" },
    ],
  },
  {
    id: "openai", name: "OpenAI DALL-E 3", detail: "יצירת תמונות מודעות AI",
    iconType: "openai", envKey: "OPENAI_API_KEY",
    oauthProvider: null, oauthLabel: null,
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-proj-...", secret: true, hint: "platform.openai.com/api-keys" },
    ],
  },
];

const AnthropicIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#D97757"/>
    <path d="M14.67 6h-2.27L8 18h2.27l.97-2.67h3.52L15.73 18H18L14.67 6zm-2.9 7.6 1.23-3.38 1.23 3.38h-2.46z" fill="white"/>
  </svg>
);
const OpenAIIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#10a37f"/>
    <path d="M19.07 9.51a4.67 4.67 0 0 0-.32-3.83 4.73 4.73 0 0 0-5.1-2.27 4.67 4.67 0 0 0-3.52-1.57 4.73 4.73 0 0 0-4.5 3.27 4.67 4.67 0 0 0-3.12 2.27 4.73 4.73 0 0 0 .58 5.55 4.67 4.67 0 0 0 .32 3.83 4.73 4.73 0 0 0 5.1 2.27 4.67 4.67 0 0 0 3.52 1.57 4.73 4.73 0 0 0 4.51-3.28 4.67 4.67 0 0 0 3.12-2.27 4.73 4.73 0 0 0-.59-5.54zm-7.03 9.85a3.5 3.5 0 0 1-2.25-.82l.11-.06 3.73-2.15a.62.62 0 0 0 .31-.54V11.1l1.58.91a.06.06 0 0 1 .03.05v4.35a3.52 3.52 0 0 1-3.51 3.51v-.06zM4.37 16.9a3.5 3.5 0 0 1-.42-2.35l.11.07 3.73 2.15c.19.11.43.11.62 0l4.56-2.63v1.82a.06.06 0 0 1-.02.05L9.2 18.1a3.52 3.52 0 0 1-4.83-1.2zm-.92-8.15a3.5 3.5 0 0 1 1.83-1.54v4.43c0 .22.12.43.31.54l4.55 2.63-1.57.91a.06.06 0 0 1-.06 0L4.76 13.1a3.52 3.52 0 0 1-.31-4.35zm12.93 3.02-4.56-2.63 1.57-.91a.06.06 0 0 1 .06 0l3.75 2.17a3.51 3.51 0 0 1-.54 6.33v-4.43a.62.62 0 0 0-.28-.53zm1.57-2.37-.11-.07-3.73-2.15a.62.62 0 0 0-.62 0L8.93 9.81V7.99a.06.06 0 0 1 .02-.05l3.75-2.17a3.51 3.51 0 0 1 5.25 3.63zM8.03 12.9l-1.57-.91a.06.06 0 0 1-.03-.05V7.59a3.51 3.51 0 0 1 5.76-2.7l-.11.06-3.73 2.15a.62.62 0 0 0-.31.54v.01L8.03 12.9zm.85-1.84 2.03-1.17 2.03 1.17v2.34l-2.03 1.17-2.03-1.17V11.06z" fill="white"/>
  </svg>
);

function IntegrationIcon({ type, size = 20 }: { type: string; size?: number }) {
  if (type === "google") return <GoogleIcon size={size} />;
  if (type === "meta") return <MetaIcon size={size} />;
  if (type === "tiktok") return <TikTokIcon size={size} />;
  if (type === "anthropic") return <AnthropicIcon size={size} />;
  if (type === "openai") return <OpenAIIcon size={size} />;
  return <span style={{ fontSize: size * 0.75 }}>🛒</span>;
}

function ConnectModal({ integration, savedValues, onClose, onSave }: {
  integration: IntegrationDef;
  savedValues: Record<string, string>;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(savedValues);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [oauthStatus, setOauthStatus] = useState<"idle" | "waiting" | "done">(
    Object.keys(savedValues).length > 0 ? "done" : "idle"
  );

  function buildOAuthUrl() {
    const origin = window.location.origin;
    const redirectUri = `${origin}/api/auth/token`;
    if (integration.oauthProvider === "google") {
      const scopes = integration.oauthScopes || "https://www.googleapis.com/auth/adwords";
      const clientId = values.client_id || "";
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&access_type=offline&prompt=consent`;
    }
    if (integration.oauthProvider === "meta") {
      const appId = values.app_id || "";
      return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=ads_management,ads_read,business_management`;
    }
    if (integration.oauthProvider === "tiktok") {
      const appId = values.app_id || "";
      return `https://ads.tiktok.com/marketing_api/auth?app_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=adscale`;
    }
    return "";
  }

  function handleOAuth() {
    const url = buildOAuthUrl();
    if (!url) return;
    window.open(url, "_blank", "width=620,height=720,scrollbars=yes,resizable=yes");
    setOauthStatus("waiting");
  }

  const oauthBg: Record<string, string> = {
    google: "linear-gradient(135deg,#4285F4,#34A853)",
    meta: "linear-gradient(135deg,#1877F2,#0064D0)",
    tiktok: "linear-gradient(135deg,#010101,#444)",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.15)", position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IntegrationIcon type={integration.iconType} size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{integration.name}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{integration.detail}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", fontSize: 18, lineHeight: 1, padding: 6 }}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {integration.fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 5 }}>
                {f.label}
                {f.hint && <span style={{ color: "#94a3b8", marginRight: 6 }}>— {f.hint}</span>}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={f.secret && !showSecrets[f.key] ? "password" : "text"}
                  value={values[f.key] || ""}
                  onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  dir="ltr"
                  style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", paddingLeft: f.secret ? 40 : 14, fontSize: 13, color: "#1e293b", outline: "none", fontFamily: "monospace" }}
                />
                {f.secret && (
                  <button
                    onClick={() => setShowSecrets(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, padding: 0 }}
                  >
                    {showSecrets[f.key] ? "🙈" : "👁️"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* OAuth section */}
        {integration.oauthProvider && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              לאחר הזנת הפרטים, אשר את ההרשאות מול {integration.oauthLabel}
            </div>
            <button
              onClick={handleOAuth}
              style={{ width: "100%", padding: 11, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: oauthBg[integration.oauthProvider] || "#333", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <IntegrationIcon type={integration.iconType} size={18} />
              אשר חיבור דרך {integration.oauthLabel}
            </button>
            {oauthStatus === "waiting" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#f5a623", textAlign: "center" }}>
                חלון האישור נפתח — אשר את ההרשאות ולאחר מכן לחץ "שמור"
              </div>
            )}
            {oauthStatus === "done" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#00d4aa", textAlign: "center" }}>✓ ההרשאה אושרה</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 13 }}>
            ביטול
          </button>
          {!integration.oauthProvider && (
            <button
              onClick={() => { onSave(values); onClose(); }}
              style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c74ff,#5e55e8)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              שמור חיבור
            </button>
          )}
          {integration.oauthProvider && (
            <button
              onClick={() => { onSave(values); onClose(); }}
              style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: oauthStatus !== "idle" ? "linear-gradient(135deg,#00d4aa,#009b7d)" : "linear-gradient(135deg,#7c74ff,#5e55e8)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              {oauthStatus !== "idle" ? "✓ שמור חיבור" : "שמור"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ad Creator Tab ──────────────────────────────────────────────────────────
const AD_PLATFORMS = ["meta", "google", "tiktok"] as const;
const AD_TONES = [
  { value: "enthusiastic", he: "נלהב", en: "Enthusiastic" },
  { value: "professional", he: "מקצועי", en: "Professional" },
  { value: "playful", he: "שובב", en: "Playful" },
];
const AD_STYLES = [
  { value: "modern", he: "מינימליסטי", en: "Minimalist" },
  { value: "lifestyle", he: "לייפסטייל", en: "Lifestyle" },
  { value: "bold", he: "בולט ועוצמתי", en: "Bold" },
  { value: "luxury", he: "יוקרתי", en: "Luxury" },
];

function AdCreatorTab({ s, t, lang, connections, isMobile }: {
  s: Record<string, any>;
  t: (he: string, en: string) => string;
  lang: "he" | "en";
  connections: Record<string, Record<string, string>>;
  isMobile: boolean;
}) {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [productsDemo, setProductsDemo] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WooProduct | null>(null);
  const [platform, setPlatform] = useState<"meta" | "google" | "tiktok">("meta");
  const [tone, setTone] = useState("enthusiastic");
  const [imageStyle, setImageStyle] = useState("modern");
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [selectedVar, setSelectedVar] = useState(0);
  const [generatingText, setGeneratingText] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTargetUrl, setPublishTargetUrl] = useState("");
  const [publishCampaignName, setPublishCampaignName] = useState("");
  const [publishBudget, setPublishBudget] = useState("50");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handlePublish() {
    if (!variations[selectedVar]) return;
    setPublishing(true);
    setPublishResult(null);
    const v = variations[selectedVar];
    try {
      const res = await fetch("/api/ads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          headline: v.headline,
          description: v.description,
          cta: v.cta,
          imageUrl: generatedImage || undefined,
          targetUrl: publishTargetUrl,
          campaignName: publishCampaignName || `AdScale – ${selectedProduct?.name || "קמפיין"}`,
          dailyBudget: Number(publishBudget) || 50,
          connections,
        }),
      });
      const data = await res.json();
      if (data.error) setPublishResult({ success: false, message: data.error });
      else setPublishResult({ success: true, message: data.message });
    } catch (e: any) {
      setPublishResult({ success: false, message: e.message });
    } finally {
      setPublishing(false);
    }
  }

  const wooKey = JSON.stringify(connections.woocommerce ?? {});
  useEffect(() => {
    fetch("/api/woocommerce/products", {
      headers: { "x-connections": JSON.stringify(connections) },
    })
      .then(r => r.json())
      .then(d => {
        setProducts(d.products || []);
        setProductsDemo(d.isDemo);
        if (d.products?.length) setSelectedProduct(d.products[0]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wooKey]);

  async function generateText() {
    if (!selectedProduct) return;
    setGeneratingText(true);
    setTextError(null);
    setVariations([]);
    setGeneratedImage(null);
    try {
      const res = await fetch("/api/ads/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: selectedProduct, platform, lang, tone, connections }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setVariations(d.variations || []);
      setSelectedVar(0);
    } catch (e: any) {
      setTextError(e.message);
    } finally {
      setGeneratingText(false);
    }
  }

  async function generateImage() {
    if (!selectedProduct) return;
    setGeneratingImage(true);
    setImageError(null);
    const headline = variations[selectedVar]?.headline || "";
    try {
      const res = await fetch("/api/ads/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: selectedProduct, platform, headline, style: imageStyle, connections }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setGeneratedImage(d.url);
    } catch (e: any) {
      setImageError(e.message);
    } finally {
      setGeneratingImage(false);
    }
  }

  function copyToClipboard() {
    if (!variations[selectedVar]) return;
    const v = variations[selectedVar];
    const text = `${v.emoji} ${v.headline}\n\n${v.description}\n\n${v.cta}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const platformColors: Record<string, string> = { meta: "#1877F2", google: "#4285F4", tiktok: "#ff0050" };

  return (
    <>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>🎨 {t("מחולל מודעות AI", "AI Ad Creator")}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
            {t("טקסט ותמונות לפרסום ממוצרי WooCommerce", "Text & images from WooCommerce products")}
          </div>
        </div>
      </div>

      {productsDemo && (
        <div style={{ background: "#7c74ff12", border: "1px solid #7c74ff33", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#7c74ff" }}>
          {t("מוצרים לדוגמה — חבר WooCommerce בהגדרות לנתונים אמיתיים","Demo products — connect WooCommerce in Settings for real data")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "340px 1fr", gap: isMobile ? 12 : 20, alignItems: "start" }}>
        {/* Left panel: controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Product selector */}
          <div style={s.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("מוצר", "Product")}
            </div>
            <select
              value={selectedProduct?.id || ""}
              onChange={e => setSelectedProduct(products.find(p => p.id === Number(e.target.value)) || null)}
              style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#1e293b", cursor: "pointer" }}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — ₪{p.sale_price || p.price}</option>
              ))}
            </select>
            {selectedProduct?.images?.[0]?.src && (
              <img
                src={selectedProduct.images[0].src}
                alt={selectedProduct.name}
                style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, marginTop: 10, border: "1px solid #e2e8f0" }}
              />
            )}
            {selectedProduct && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                {(selectedProduct.short_description || selectedProduct.description || "").replace(/<[^>]+>/g, "").slice(0, 100)}...
              </div>
            )}
          </div>

          {/* Platform */}
          <div style={s.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("פלטפורמה", "Platform")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {AD_PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, border: `2px solid ${platform === p ? platformColors[p] : "#e2e8f0"}`,
                  background: platform === p ? platformColors[p] + "15" : "#f8fafc",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <PlatformIcon platform={p} size={20} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: platform === p ? platformColors[p] : "#94a3b8" }}>
                    {p === "meta" ? "Meta" : p === "google" ? "Google" : "TikTok"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div style={s.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("סגנון כתיבה", "Writing Tone")}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {AD_TONES.map(tt => (
                <button key={tt.value} onClick={() => setTone(tt.value)} style={{
                  flex: 1, padding: "7px 4px", borderRadius: 8, border: `2px solid ${tone === tt.value ? "#7c74ff" : "#e2e8f0"}`,
                  background: tone === tt.value ? "#7c74ff15" : "#f8fafc",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  color: tone === tt.value ? "#7c74ff" : "#94a3b8",
                }}>
                  {lang === "he" ? tt.he : tt.en}
                </button>
              ))}
            </div>
          </div>

          {/* Image style */}
          <div style={s.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("סגנון תמונה", "Image Style")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {AD_STYLES.map(st => (
                <button key={st.value} onClick={() => setImageStyle(st.value)} style={{
                  padding: "7px 8px", borderRadius: 8, border: `2px solid ${imageStyle === st.value ? "#00d4aa" : "#e2e8f0"}`,
                  background: imageStyle === st.value ? "#00d4aa15" : "#f8fafc",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  color: imageStyle === st.value ? "#00d4aa" : "#94a3b8",
                }}>
                  {lang === "he" ? st.he : st.en}
                </button>
              ))}
            </div>
          </div>

          {/* Generate buttons — always visible */}
          <button
            onClick={generateText}
            disabled={generatingText || !selectedProduct}
            style={{ ...s.btn("primary"), width: "100%", padding: "12px 0", fontSize: 14, opacity: generatingText || !selectedProduct ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {generatingText ? (
              <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> {t("מייצר טקסט...","Generating text...")}</>
            ) : (
              <>✨ {t("צור טקסט מודעה","Generate Ad Text")}</>
            )}
          </button>

          <button
            onClick={generateImage}
            disabled={generatingImage || !selectedProduct}
            style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: generatingImage || !selectedProduct ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg,#00d4aa,#009b7d)", color: "#fff", opacity: generatingImage || !selectedProduct ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {generatingImage ? (
              <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> {t("מייצר תמונה...","Generating image...")}</>
            ) : (
              <>🖼️ {t("צור תמונה","Generate Image")}</>
            )}
          </button>
        </div>

        {/* Right panel: results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Text variations */}
          {variations.length > 0 && (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t("וריאציות טקסט","Text Variations")}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={copyToClipboard} style={{ ...s.btn("sm"), background: copied ? "#00d4aa15" : "#f0f4f8", color: copied ? "#00d4aa" : "#475569" }}>
                    {copied ? "✓ " + t("הועתק","Copied") : "📋 " + t("העתק","Copy")}
                  </button>
                  <button
                    onClick={() => { setPublishOpen(true); setPublishResult(null); }}
                    style={{ ...s.btn("sm"), background: "linear-gradient(135deg,#7c74ff,#5e55e8)", color: "#fff", fontWeight: 700 }}
                  >
                    🚀 {t("פרסם","Publish")}
                  </button>
                </div>
              </div>
              {/* Tab selector */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {variations.map((_, i) => (
                  <button key={i} onClick={() => setSelectedVar(i)} style={{
                    padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: selectedVar === i ? "#7c74ff" : "#f0f4f8",
                    color: selectedVar === i ? "#fff" : "#64748b",
                  }}>
                    {t("וריאציה","Variation")} {i + 1}
                  </button>
                ))}
              </div>

              {variations[selectedVar] && (() => {
                const v = variations[selectedVar];
                return (
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20, border: `2px solid ${platformColors[platform]}22` }}>
                    {/* Ad preview mockup */}
                    <div style={{ background: "#ffffff", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <PlatformIcon platform={platform} size={18} />
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{t("תצוגה מקדימה","Preview")}</span>
                        <span style={{ marginRight: "auto", fontSize: 10, background: "#f0f4f8", padding: "2px 8px", borderRadius: 10, color: "#64748b" }}>
                          {platform === "meta" ? "Sponsored" : platform === "google" ? "Ad" : "Promoted"}
                        </span>
                      </div>
                      {selectedProduct?.images?.[0]?.src && (
                        <img src={selectedProduct.images[0].src} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, marginBottom: 10 }} />
                      )}
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                        {v.emoji} {v.headline}
                      </div>
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 10 }}>
                        {v.description}
                      </div>
                      <div style={{ display: "inline-block", padding: "7px 18px", borderRadius: 6, background: platformColors[platform], color: "#fff", fontSize: 13, fontWeight: 700 }}>
                        {v.cta}
                      </div>
                    </div>
                    {/* Raw fields */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        [t("כותרת","Headline"), v.headline, v.headline.length],
                        [t("תיאור","Description"), v.description, v.description.length],
                        ["CTA", v.cta, null],
                      ].map(([label, val, len]) => (
                        <div key={label as string} style={{ background: "#ffffff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{label}</span>
                            {len !== null && <span style={{ fontSize: 10, color: (len as number) > 50 ? "#f5a623" : "#00d4aa" }}>{len} {t("תווים","chars")}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#1e293b", direction: lang === "he" ? "rtl" : "ltr" }}>{val as string}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {textError && (
            <div style={{ background: "#ef444410", border: "1px solid #ef444433", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#ef4444" }}>
              ⚠️ {textError}
            </div>
          )}

          {/* Generated image */}
          {(generatingImage || generatedImage || imageError) && (
            <div style={s.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                🖼️ {t("תמונת מודעה מ-DALL-E 3","Ad Image from DALL-E 3")}
              </div>
              {generatingImage && (
                <div style={{ background: "#f8fafc", borderRadius: 10, height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, border: "2px dashed #e2e8f0" }}>
                  <div style={{ fontSize: 32, animation: "pulse 1.5s ease-in-out infinite" }}>🎨</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>{t("DALL-E 3 יוצר תמונה...","DALL-E 3 is generating...")}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{t("זה לוקח כ-15 שניות","This takes about 15 seconds")}</div>
                </div>
              )}
              {!generatingImage && generatedImage && (
                <div>
                  <img src={generatedImage} alt="Generated ad" style={{ width: "100%", borderRadius: 10, border: "1px solid #e2e8f0" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <a
                      href={generatedImage}
                      download="ad-image.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...s.btn("primary"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
                    >
                      ⬇️ {t("הורד תמונה","Download Image")}
                    </a>
                    <button onClick={generateImage} style={s.btn("default")}>
                      ↻ {t("צור מחדש","Regenerate")}
                    </button>
                  </div>
                </div>
              )}
              {imageError && (
                <div style={{ fontSize: 13, color: "#ef4444", padding: "12px 16px", background: "#ef444410", borderRadius: 8 }}>
                  ⚠️ {imageError}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!generatingText && variations.length === 0 && !textError && (
            <div style={{ ...s.card, textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
                {t("בחר מוצר ולחץ 'צור טקסט מודעה'","Select a product and click 'Generate Ad Text'")}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 340, margin: "0 auto" }}>
                {t("Claude AI יצור 3 וריאציות של טקסט פרסומי מותאם לפלטפורמה שבחרת","Claude AI will create 3 ad copy variations tailored to your chosen platform")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Publish Modal ── */}
      {publishOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setPublishOpen(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>🚀 {t("פרסם מודעה","Publish Ad")}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {platform === "google" ? "Google Ads" : platform === "meta" ? "Meta Ads" : "TikTok Ads"}
                  {" — "}
                  {variations[selectedVar]?.headline}
                </div>
              </div>
              <button onClick={() => setPublishOpen(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                  🔗 {t("כתובת דף נחיתה","Landing Page URL")} *
                </label>
                <input
                  value={publishTargetUrl}
                  onChange={e => setPublishTargetUrl(e.target.value)}
                  placeholder={selectedProduct?.permalink || "https://mystore.co.il/product/..."}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  dir="ltr"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                  📋 {t("שם קמפיין","Campaign Name")}
                </label>
                <input
                  value={publishCampaignName}
                  onChange={e => setPublishCampaignName(e.target.value)}
                  placeholder={`AdScale – ${selectedProduct?.name || "קמפיין חדש"}`}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                  💰 {t("תקציב יומי (₪)","Daily Budget (₪)")}
                </label>
                <input
                  type="number" min="1" value={publishBudget}
                  onChange={e => setPublishBudget(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Ad preview summary */}
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", border: "1px solid #e2e8f0", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#475569", marginBottom: 6 }}>{t("מה יפורסם:","What will be published:")}</div>
                <div style={{ color: "#1e293b", marginBottom: 2 }}>📝 {variations[selectedVar]?.headline}</div>
                <div style={{ color: "#64748b" }}>📄 {variations[selectedVar]?.description?.substring(0, 80)}...</div>
                {generatedImage && <div style={{ color: "#00d4aa", marginTop: 4 }}>🖼️ {t("כולל תמונה שנוצרה","Includes generated image")}</div>}
              </div>

              {/* Platform warning if missing credentials */}
              {!connections[platform === "google" ? "google_ads" : platform]?.access_token && (
                <div style={{ background: "#fef3c710", border: "1px solid #f5a62333", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
                  ⚠️ {t("חסר Access Token — הוסף אותו בהגדרות → חיבורים","Missing Access Token — add it in Settings → Connections")}
                </div>
              )}
            </div>

            {/* Result */}
            {publishResult && (
              <div style={{ background: publishResult.success ? "#00d4aa10" : "#ef444410", border: `1px solid ${publishResult.success ? "#00d4aa33" : "#ef444433"}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: publishResult.success ? "#065f46" : "#b91c1c", marginBottom: 16 }}>
                {publishResult.success ? "✅ " : "❌ "}{publishResult.message}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setPublishOpen(false)} style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 13 }}>
                {t("ביטול","Cancel")}
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing || !publishTargetUrl}
                style={{ padding: "9px 24px", borderRadius: 10, border: "none", background: publishing || !publishTargetUrl ? "#94a3b8" : "linear-gradient(135deg,#7c74ff,#5e55e8)", color: "#fff", cursor: publishing || !publishTargetUrl ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}
              >
                {publishing ? "⏳ " + t("שולח...","Publishing...") : "🚀 " + t("פרסם עכשיו","Publish Now")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  const [animIn, setAnimIn] = useState(false);
  const [preset, setPreset] = useState(0);
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);
  const [lang, setLang] = useState<"he" | "en">("he");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const t = (he: string, en: string) => lang === "he" ? he : en;
  const TABS = getTabs(lang);
  const AI_SUGGESTIONS = lang === "he" ? AI_SUGGESTIONS_HE : AI_SUGGESTIONS_EN;
  const DATE_PRESETS = lang === "he" ? DATE_PRESETS_HE : DATE_PRESETS_EN;

  // Negative keywords tab state
  const [negTerms, setNegTerms] = useState<any[]>([]);
  const [negLoading, setNegLoading] = useState(false);
  const [negSelected, setNegSelected] = useState<Set<string>>(new Set());
  const [negApplying, setNegApplying] = useState(false);
  const [negResult, setNegResult] = useState<{ listName: string; added: number; campaignsLinked: number } | null>(null);
  const [negApiErrors, setNegApiErrors] = useState<string[]>([]);
  const [negExistingList, setNegExistingList] = useState<{ id: string; name: string } | null>(null);
  const [negMatchType, setNegMatchType] = useState<"BROAD" | "PHRASE" | "EXACT">("BROAD");

  // Connections (settings tab)
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [connections, setConnections] = useState<Record<string, Record<string, string>>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("adscale_connections") || "{}"); } catch { return {}; }
  });

  // On mount: sync connections between server and localStorage
  // - Desktop with data  → pushes localStorage to server (migration / update)
  // - Mobile (no LS)     → pulls from server (picks up desktop's connections)
  // - Both have data     → server wins (most up-to-date cross-device source)
  useEffect(() => {
    const localConns = (() => {
      try { return JSON.parse(localStorage.getItem("adscale_connections") || "{}"); } catch { return {}; }
    })();
    const hasLocal = Object.keys(localConns).length > 0;

    fetch("/api/connections")
      .then(r => r.json())
      .then((serverConns: Record<string, Record<string, string>>) => {
        const hasServer = serverConns && Object.keys(serverConns).length > 0;

        if (hasServer) {
          // Server is the source of truth — use it (mobile gets desktop data)
          setConnections(serverConns);
          localStorage.setItem("adscale_connections", JSON.stringify(serverConns));
        } else if (hasLocal) {
          // Server is empty but we have local data → push to server (first-time migration)
          fetch("/api/connections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localConns),
          }).catch(() => {});
          // connections state already set from localStorage (useState initializer)
        }
      })
      .catch(() => {});
  }, []);

  function saveConnection(id: string, values: Record<string, string>) {
    const next = { ...connections, [id]: values };
    setConnections(next);
    if (typeof window !== "undefined") localStorage.setItem("adscale_connections", JSON.stringify(next));
    // Persist to server so other devices (mobile/desktop) share the same connections
    fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

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

  useEffect(() => { if (activeTab === 4) loadNegTerms(); }, [activeTab]);

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

  const dir = lang === "he" ? "rtl" : "ltr";

  const s: Record<string, any> = {
    root: { minHeight: "100vh", background: "#f0f4f8", color: "#1e293b", fontFamily: "'Rubik','Heebo',sans-serif", direction: dir, display: "flex", flexDirection: isMobile ? "column" : "row" },
    sidebar: isMobile ? { display: "none" } : { width: 230, minHeight: "100vh", background: "#ffffff", borderLeft: lang === "he" ? "1px solid #e2e8f0" : "none", borderRight: lang === "en" ? "1px solid #e2e8f0" : "none", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0, boxShadow: "0 0 20px rgba(0,0,0,0.06)" },
    main: { flex: 1, padding: isMobile ? "16px 14px 90px" : "32px 36px", minWidth: 0, overflowY: "auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-start", marginBottom: isMobile ? 16 : 28, flexWrap: "wrap" as const, gap: isMobile ? 10 : 0 },
    card: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: isMobile ? 12 : 16, padding: isMobile ? 14 : 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
    statsGrid: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 14, marginBottom: 20 },
    grid2: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 10 : 14, marginBottom: 20 },
    btn: (v: string) => ({
      padding: v === "sm" ? "5px 12px" : "9px 20px", borderRadius: 10, border: "none",
      cursor: "pointer", fontSize: v === "sm" ? 11 : 13, fontWeight: 600,
      background: v === "primary" ? "linear-gradient(135deg,#7c74ff,#5e55e8)" : "#f0f4f8",
      color: v === "primary" ? "#fff" : "#475569", transition: "opacity 0.2s",
    }),
    th: { fontSize: 11, color: "#64748b", fontWeight: 500, textAlign: "right" as const, padding: "5px 12px 12px", borderBottom: "1px solid #e2e8f0" },
    td: { padding: "12px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" as const },
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
  const connectedPlatforms = ["google", "meta", "tiktok"].filter(p => {
    const id = p === "google" ? "google_ads" : p;
    return connections[id] && Object.keys(connections[id]).length > 0;
  });

  /* mobile tabs visible in bottom nav: pick 5 most-used */
  const MOBILE_NAV_TABS = [0, 1, 4, 5, 6]; // dashboard, campaigns, neg-kw, ad creator, settings

  return (
    <div style={s.root}>

      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div style={{ position: "sticky", top: 0, zIndex: 200, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg,#7c74ff,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AdScale AI
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#f0f4f8", borderRadius: 8, padding: 2, gap: 2 }}>
              {(["he", "en"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: lang === l ? "#fff" : "transparent", color: lang === l ? "#7c74ff" : "#94a3b8", boxShadow: lang === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  {l === "he" ? "ע" : "EN"}
                </button>
              ))}
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? "#00d4aa" : "#f5a623" }} title={isLive ? "Live" : "Demo"} />
          </div>
        </div>
      )}

      <div style={s.sidebar}>
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #e2e8f0", marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#7c74ff,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AdScale AI
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {t("פרסום חכם לאיקומרס", "Smart e-commerce ads")}
          </div>
          {/* Language switcher */}
          <div style={{ display: "flex", gap: 4, marginTop: 12, background: "#f0f4f8", borderRadius: 8, padding: 3 }}>
            {(["he", "en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                flex: 1, padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: lang === l ? "#ffffff" : "transparent",
                color: lang === l ? "#7c74ff" : "#94a3b8",
                boxShadow: lang === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
              }}>
                {l === "he" ? "עברית" : "English"}
              </button>
            ))}
          </div>
        </div>
        {TABS.map((tab, i) => (
          <div key={i} onClick={() => setActiveTab(i)} style={{
            padding: "11px 20px", cursor: "pointer", fontSize: 14,
            fontWeight: activeTab === i ? 600 : 400,
            color: activeTab === i ? "#1e293b" : "#94a3b8",
            background: activeTab === i ? "#7c74ff14" : "transparent",
            borderRight: lang === "he" && activeTab === i ? "3px solid #7c74ff" : lang === "he" ? "3px solid transparent" : "none",
            borderLeft: lang === "en" && activeTab === i ? "3px solid #7c74ff" : lang === "en" ? "3px solid transparent" : "none",
            display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </div>
        ))}
        <div style={{ margin: "auto 16px 16px", background: isLive ? "#00d4aa10" : "#7c74ff10", border: `1px solid ${isLive ? "#00d4aa33" : "#7c74ff33"}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isLive ? "#00d4aa" : "#7c74ff", marginBottom: 3 }}>
            {isLive ? t("נתונים חיים", "Live Data") : t("מצב דמו", "Demo Mode")}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>
            {isLive && lastUpdated
              ? `${t("עודכן", "Updated")}: ${new Date(lastUpdated).toLocaleTimeString(lang === "he" ? "he-IL" : "en-US")}`
              : t("חבר API Keys לנתונים אמיתיים", "Connect API Keys for live data")}
          </div>
        </div>
      </div>

      <div style={s.main}>
        {apiErrors.length > 0 && isLive && (
          <div style={{ background: "#f5a62312", border: "1px solid #f5a62333", borderRadius: 12, padding: "12px 18px", marginBottom: 16, fontSize: 13 }}>
            {t("חלק מהפלטפורמות לא נטענו", "Some platforms failed to load")}
          </div>
        )}

        {activeTab === 0 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{t("דשבורד ראשי", "Main Dashboard")}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  {loading ? t("טוען נתונים...", "Loading...") : isLive ? t("נתונים חיים", "Live data") : t("מצב דמו", "Demo mode")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
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
                <button style={s.btn("default")} onClick={refetch}>↻</button>
                {!isMobile && <button style={s.btn("primary")} onClick={() => setActiveTab(1)}>+ {t("קמפיין חדש", "New Campaign")}</button>}
              </div>
            </div>

            {/* Stats row */}
            <div style={s.statsGrid}>
              {[
                { label: t("הוצאה כוללת", "Total Spend"), val: summary.totalSpent, prefix: "₪", data: timeSeries.map(d => d.spent) },
                { label: t("הכנסה", "Revenue"), val: summary.totalRevenue, prefix: "₪", data: timeSeries.map(d => d.revenue) },
                { label: t("ROAS ממוצע", "Avg ROAS"), val: summary.avgRoas, suffix: "x", data: timeSeries.map(d => d.roas) },
                { label: t("המרות", "Conversions"), val: summary.totalConversions, data: timeSeries.map(d => d.conversions) },
              ].map((m, i) => (
                <div key={i} style={{ ...s.card, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(18px)", transition: `all 0.45s ease ${i * 0.08}s` }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{m.label}</div>
                  {loading ? <Skeleton h={32} r={6} /> :
                    <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, letterSpacing: "-1px", color: "#1e293b" }}>
                      {m.prefix}{typeof m.val === "number" ? (m.label.includes("ROAS") || m.label.includes("Avg") ? m.val.toFixed(2) : Math.round(m.val).toLocaleString()) : m.val}{m.suffix}
                    </div>
                  }
                  <div style={{ marginTop: 10 }}>
                    {loading ? <Skeleton h={40} /> : <MiniChart data={m.data} color="#7c74ff" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Reports row */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>
                {t("דוחות לפי פלטפורמה", "Reports by Platform")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {(["google", "meta", "tiktok"] as const).map(p => {
                  const ps = byPlatform.find((x: { platform: string }) => x.platform === p);
                  const connId = p === "google" ? "google_ads" : p;
                  const isConn = connections[connId] && Object.keys(connections[connId]).length > 0;
                  return (
                    <div key={p} style={{ ...s.card, borderTop: `3px solid ${platformColors[p]}`, opacity: animIn ? 1 : 0, transition: `all 0.4s ease ${["google","meta","tiktok"].indexOf(p) * 0.1}s` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <PlatformIcon platform={p} size={20} />
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{platformLabels[lang][p]}</span>
                        </div>
                        {isConn
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: "#00d4aa", background: "#00d4aa15", padding: "2px 8px", borderRadius: 10 }}>● {t("מחובר", "Connected")}</span>
                          : <span style={{ fontSize: 10, color: "#94a3b8", cursor: "pointer", textDecoration: "underline" }} onClick={() => setActiveTab(5)}>{t("חבר", "Connect")}</span>
                        }
                      </div>
                      {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <Skeleton h={16} /><Skeleton h={16} w="70%" />
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {([
                            [t("הוצאה", "Spend"), `₪${Math.round(ps?.spent ?? 0).toLocaleString()}`],
                            ["ROAS", `${(ps?.roas ?? 0).toFixed(1)}x`],
                            [t("קליקים", "Clicks"), `${(ps?.clicks ?? 0).toLocaleString()}`],
                            [t("המרות", "Conversions"), `${ps?.conversions ?? 0}`],
                          ] as [string, string][]).map(([lbl, val]) => (
                            <div key={lbl} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>{lbl}</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {t("תקופה", "Period")}: {DATE_PRESETS[preset].label}
                        </span>
                        <button style={{ ...s.btn("sm"), fontSize: 10 }} onClick={() => setActiveTab(1)}>
                          {t("פרטים", "Details")} →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{t("הוצאה vs. הכנסה", "Spend vs. Revenue")}</div>
                <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                  {[["#00d4aa", t("הכנסה","Revenue")],["#7c74ff", t("הוצאה","Spend")]].map(([c,l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
                {loading ? <Skeleton h={110} /> : <BarChart data={timeSeries} />}
              </div>
              <div style={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{t("המלצות AI דחופות", "Urgent AI Recommendations")}</div>
                {AI_SUGGESTIONS.filter(sg => sg.priority === "high").map(sg => (
                  <div key={sg.id} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: "1px solid #7c74ff22", display: "flex", gap: 10 }}>
                    <PlatformIcon platform={sg.platform} size={20} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: "#475569" }}>{sg.message}</div>
                      <div style={{ fontSize: 11, color: "#00d4aa", fontWeight: 700, marginTop: 3 }}>{t("צפי","Est.")}: {sg.impact}</div>
                    </div>
                    <button style={s.btn("sm")} onClick={() => { setAppliedSuggestions(p => [...p, sg.id]); setActiveTab(2); }}>{t("יישם","Apply")}</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{t("ביצועים לפי פלטפורמה", "Performance by Platform")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {(["google","meta","tiktok"] as const).map(p => {
                  const ps = byPlatform.find((x: { platform: string }) => x.platform === p);
                  return (
                    <div key={p} style={{ background: "#f8fafc", borderRadius: 14, padding: "18px 20px", border: `1px solid ${platformColors[p]}22` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <PlatformIcon platform={p} size={22} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{platformLabels[lang][p]}</span>
                      </div>
                      {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <Skeleton h={18} /><Skeleton h={18} w="70%" />
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {([
                            [t("הוצאה","Spend"), `₪${Math.round(ps?.spent ?? 0).toLocaleString()}`],
                            ["ROAS", `${(ps?.roas ?? 0).toFixed(1)}x`],
                            [t("קליקים","Clicks"), `${(ps?.clicks ?? 0).toLocaleString()}`],
                            [t("המרות","Conv."), `${ps?.conversions ?? 0}`],
                          ] as [string, string][]).map(([l2, v2]) => (
                            <div key={l2}>
                              <div style={{ fontSize: 10, color: "#94a3b8" }}>{l2}</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{v2}</div>
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
                <div style={{ fontSize: 26, fontWeight: 700 }}>{t("קמפיינים", "Campaigns")}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  {localCampaigns.length} {t("קמפיינים", "campaigns")}
                </div>
              </div>
              <button style={s.btn("primary")}>+ {t("קמפיין חדש", "New Campaign")}</button>
            </div>
            <div style={s.card}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
                  {[...Array(5)].map((_, i) => <Skeleton key={i} h={44} r={8} />)}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 560 : "unset" }}>
                  <thead>
                    <tr>{[t("שם קמפיין","Campaign"),t("פלטפורמה","Platform"),t("סטטוס","Status"),t("תקציב","Budget"),t("הוצאה","Spend"),"ROAS",t("המרות","Conv."),t("פעולות","Actions")].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {localCampaigns.map((c, i) => (
                      <tr key={c.id} style={{ opacity: animIn ? 1 : 0, transition: `opacity 0.4s ease ${i * 0.06}s` }}>
                        <td style={s.td}><div style={{ fontWeight: 600 }}>{c.name}</div></td>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <PlatformIcon platform={c.platform} size={16} />
                            <span style={{ fontSize: 12, color: "#64748b" }}>{platformLabels[lang][c.platform]}</span>
                          </div>
                        </td>
                        <td style={s.td}>
                          <span style={s.badge(c.status)}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor[c.status], display: "inline-block" }} />
                            {statusLabel[lang][c.status]}
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
                            <button style={s.btn("sm")}>{t("ערוך","Edit")}</button>
                            {c.status !== "draft" && (
                              <button style={{ ...s.btn("sm"), color: c.status === "active" ? "#f5a623" : "#00d4aa" }} onClick={() => toggleCampaign(c.id)}>
                                {c.status === "active" ? t("השהה","Pause") : t("הפעל","Activate")}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 2 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{t("AI אופטימיזציה", "AI Optimization")}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{AI_SUGGESTIONS.length - appliedSuggestions.length} {t("המלצות","recommendations")}</div>
              </div>
            </div>
            {AI_SUGGESTIONS.map(sg => {
              const applied = appliedSuggestions.includes(sg.id);
              return (
                <div key={sg.id} style={{ background: applied ? "#00d4aa08" : "#ffffff", border: `1px solid ${applied ? "#00d4aa44" : "#e2e8f0"}`, borderRadius: 14, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: platformColors[sg.platform] + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <PlatformIcon platform={sg.platform} size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{platformLabels[lang][sg.platform]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#7c74ff22", color: "#7c74ff" }}>{sg.impact}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{sg.message}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {applied ? <div style={{ color: "#00d4aa", fontSize: 13, fontWeight: 600 }}>{t("יושם","Applied")}</div> :
                      <button style={s.btn("primary")} onClick={() => setAppliedSuggestions(p => [...p, sg.id])}>{t("יישם","Apply")}</button>
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
              <div><div style={{ fontSize: 26, fontWeight: 700 }}>{t("קהלים","Audiences")}</div></div>
              <button style={s.btn("primary")}>+ {t("קהל חדש","New Audience")}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {[
                { name: t("רוכשים אחרונים 30 יום","Buyers last 30 days"), size: "1,248", platforms: ["google","meta"], c: "#7c74ff", icon: "🛒" },
                { name: t("עזבו עגלה","Cart Abandoners"), size: "3,401", platforms: ["meta","tiktok"], c: "#f5a623", icon: "🛍️" },
                { name: t("Lookalike רוכשים 3%","Lookalike Buyers 3%"), size: "82,000", platforms: ["meta"], c: "#00d4aa", icon: "🎯" },
                { name: t("צפו במוצר 3+ פעמים","Viewed product 3+ times"), size: "2,190", platforms: ["google","meta","tiktok"], c: "#ff6b6b", icon: "👁️" },
                { name: t("לקוחות VIP","VIP Customers"), size: "340", platforms: ["meta"], c: "#f5a623", icon: "⭐" },
                { name: t("כל המבקרים","All Visitors"), size: "24,700", platforms: ["google","meta"], c: "#7c74ff", icon: "🌐" },
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

        {activeTab === 4 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{t("מילות מפתח שליליות","Negative Keywords")}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  {negLoading ? t("טוען...","Loading...") : `${negTerms.length} ${t("מילים מוצעות","suggested terms")}`}
                  {negExistingList && <span style={{ marginRight: 10, color: "#00d4aa" }}>✓ {t("רשימה קיימת","Existing list")}: {negExistingList.name}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select
                  value={negMatchType}
                  onChange={e => setNegMatchType(e.target.value as "BROAD" | "PHRASE" | "EXACT")}
                  style={{ background: "#f0f4f8", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}
                >
                  <option value="BROAD">{t("התאמה רחבה","Broad Match")}</option>
                  <option value="PHRASE">{t("התאמת ביטוי","Phrase Match")}</option>
                  <option value="EXACT">{t("התאמה מדויקת","Exact Match")}</option>
                </select>
                <button style={s.btn("sm")} onClick={loadNegTerms} disabled={negLoading}>
                  {negLoading ? t("טוען...","Loading...") : t("רענן","Refresh")}
                </button>
                <button
                  style={{ ...s.btn("primary"), opacity: negSelected.size === 0 || negApplying ? 0.5 : 1 }}
                  onClick={applyNegKeywords}
                  disabled={negSelected.size === 0 || negApplying}
                >
                  {negApplying ? t("מוסיף...","Adding...") : `${t("הוסף לגוגל אדס","Add to Google Ads")} (${negSelected.size})`}
                </button>
              </div>
            </div>

            {negResult && (
              <div style={{ background: "#00d4aa12", border: "1px solid #00d4aa44", borderRadius: 12, padding: "14px 20px", marginBottom: 16, fontSize: 13 }}>
                <span style={{ color: "#00d4aa", fontWeight: 700 }}>{t("נוסף בהצלחה!","Added successfully!")}</span>
                {" "}{negResult.added} {t("מילים נוספו לרשימה","terms added to list")} "{negResult.listName}"
                {negResult.campaignsLinked > 0 && ` • ${t("הרשימה קושרה ל","List linked to")}-${negResult.campaignsLinked} ${t("קמפיינים","campaigns")}`}
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
                <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0" }}>
                  {negApiErrors.length > 0
                    ? t("שגיאה בטעינת הנתונים — בדוק חיבור Google Ads","Error loading data — check Google Ads connection")
                    : t("לא נמצאו מילות מפתח מוצעות לתקופה זו","No suggested keywords for this period")}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 32 }}>
                        <input type="checkbox" checked={negSelected.size === negTerms.length && negTerms.length > 0} onChange={selectAllNeg} style={{ cursor: "pointer" }} />
                      </th>
                      <th style={s.th}>{t("מילת חיפוש","Search Term")}</th>
                      <th style={s.th}>{t("מקור","Source")}</th>
                      <th style={s.th}>{t("סיבה","Reason")}</th>
                      <th style={{ ...s.th, textAlign: "left" as const }}>{t("חשיפות","Impressions")}</th>
                      <th style={{ ...s.th, textAlign: "left" as const }}>{t("קליקים","Clicks")}</th>
                      <th style={{ ...s.th, textAlign: "left" as const }}>{t("עלות","Cost")} ₪</th>
                    </tr>
                  </thead>
                  <tbody>
                    {negTerms.map((term, i) => {
                      const selected = negSelected.has(term.term);
                      return (
                        <tr key={i} onClick={() => toggleNegTerm(term.term)} style={{ cursor: "pointer", background: selected ? "#7c74ff08" : "transparent" }}>
                          <td style={s.td}>
                            <input type="checkbox" checked={selected} onChange={() => toggleNegTerm(term.term)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer" }} />
                          </td>
                          <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#1e293b" }}>{term.term}</td>
                          <td style={s.td}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                              background: term.source === "google_ads" ? "#4285F422" : "#34A85322",
                              color: term.source === "google_ads" ? "#4285F4" : "#34A853" }}>
                              {term.source === "google_ads" ? "Google Ads" : "Search Console"}
                            </span>
                          </td>
                          <td style={{ ...s.td, fontSize: 12, color: "#475569" }}>{term.reason}</td>
                          <td style={{ ...s.td, textAlign: "left" as const, fontSize: 12 }}>{term.impressions.toLocaleString()}</td>
                          <td style={{ ...s.td, textAlign: "left" as const, fontSize: 12 }}>{term.clicks.toLocaleString()}</td>
                          <td style={{ ...s.td, textAlign: "left" as const, fontSize: 12, color: term.cost > 0 ? "#ef4444" : "#94a3b8" }}>
                            {term.cost > 0 ? `₪${term.cost.toFixed(2)}` : "—"}
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

        {activeTab === 5 && <AdCreatorTab s={s} t={t} lang={lang} connections={connections} isMobile={isMobile} />}

        {activeTab === 6 && (
          <>
            <div style={s.header}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{t("חיבורים","Connections")}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  {Object.keys(connections).filter(k => Object.keys(connections[k]).length > 0).length} {t("פלטפורמות מחוברות","platforms connected")}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {INTEGRATIONS.map((intg, i) => {
                const saved = connections[intg.id] || {};
                const isConnected = Object.keys(saved).length > 0;
                return (
                  <div key={intg.id} style={{
                    ...s.card,
                    display: "flex", alignItems: "center", gap: 16,
                    opacity: animIn ? 1 : 0, transition: `opacity 0.4s ease ${i * 0.08}s`,
                    border: isConnected ? "1px solid #00d4aa44" : "1px solid #e2e8f0",
                  }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <IntegrationIcon type={intg.iconType} size={26} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{intg.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{intg.detail}</div>
                      <div style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8", marginTop: 5, background: "#f0f4f8", padding: "2px 7px", borderRadius: 4, display: "inline-block" }}>{intg.envKey}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      {isConnected && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00d4aa", background: "#00d4aa15", padding: "2px 9px", borderRadius: 10 }}>● {t("מחובר","Connected")}</div>
                      )}
                      <button
                        onClick={() => setOpenModal(intg.id)}
                        style={{
                          padding: "6px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                          fontSize: 12, fontWeight: 600,
                          background: isConnected ? "#f0f4f8" : "linear-gradient(135deg,#7c74ff,#5e55e8)",
                          color: isConnected ? "#64748b" : "#fff",
                        }}
                      >
                        {isConnected ? t("ערוך","Edit") : t("הגדר","Setup")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Partner view link ── */}
            <div style={{ ...s.card, marginTop: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#7c74ff18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👁</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{t("שתף עם שותף — צפייה בלבד", "Share with Partner — View Only")}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{t("הלינק מאפשר צפייה בנתונים ללא אפשרות עריכה", "This link allows viewing data without any editing capabilities")}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
                  <code style={{ fontSize: 12, background: "#f0f4f8", padding: "4px 10px", borderRadius: 6, color: "#475569", direction: "ltr", wordBreak: "break-all" as const }}>
                    {typeof window !== "undefined" ? window.location.origin + "/view" : "/view"}
                  </code>
                  <button onClick={() => { if (typeof window !== "undefined") navigator.clipboard?.writeText(window.location.origin + "/view"); }} style={{ padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "#7c74ff", color: "#fff" }}>
                    {t("העתק לינק", "Copy Link")}
                  </button>
                  <a href="/view" target="_blank" rel="noreferrer" style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#f0f4f8", color: "#475569", textDecoration: "none" }}>
                    {t("פתח", "Open")} ↗
                  </a>
                </div>
              </div>
            </div>

            {openModal && (() => {
              const intg = INTEGRATIONS.find(i => i.id === openModal)!;
              return (
                <ConnectModal
                  integration={intg}
                  savedValues={connections[openModal] || {}}
                  onClose={() => setOpenModal(null)}
                  onSave={(vals) => { saveConnection(openModal, vals); setOpenModal(null); }}
                />
              );
            })()}
          </>
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}>
          {MOBILE_NAV_TABS.map(tabIdx => {
            const tab = TABS[tabIdx];
            const active = activeTab === tabIdx;
            return (
              <button key={tabIdx} onClick={() => setActiveTab(tabIdx)} style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? "#7c74ff" : "#94a3b8", maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.label}</span>
                {active && <div style={{ width: 18, height: 2, borderRadius: 1, background: "#7c74ff" }} />}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: 0.82; }
        tr:hover td { background: #f8fafc; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}
