"use client";
import { useState } from "react";
import { C } from "../theme";
import { getConnections, saveConnection, removeConnection } from "../../lib/auth";
import type { Lang } from "../page";

/* ── Types ──────────────────────────────────────────────────────── */
type Status = "connected" | "disconnected" | "error" | "testing";

interface Field {
  key: string;
  label: string; labelEn: string;
  placeholder: string; placeholderEn: string;
  type: "text" | "password" | "url" | "textarea";
  hint?: string; hintEn?: string;
}

interface HelpStep {
  step: string; stepEn: string;
  link?: { text: string; textEn: string; url: string };
}

interface IntegrationDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: "ai" | "ads" | "ecommerce" | "analytics";
  description: string; descriptionEn: string;
  fields: Field[];
  helpSteps: HelpStep[];
}

/* ── Integration definitions ────────────────────────────────────── */
const INTEGRATIONS: IntegrationDef[] = [
  /* ── AI ─────────────────────────────────────────────────────── */
  {
    id: "openai", name: "OpenAI", icon: "🧠", color: "#10a37f", category: "ai",
    description: "מחבר את BScale ל-ChatGPT / GPT-4 לניתוח SEO, יצירת מודעות ותוכן",
    descriptionEn: "Connects BScale to ChatGPT / GPT-4 for SEO analysis, ad generation and content",
    fields: [
      { key:"api_key",   label:"מפתח API",        labelEn:"API Key",         placeholder:"sk-...",              placeholderEn:"sk-...",              type:"password", hint:"נמצא ב-OpenAI Platform → API Keys", hintEn:"Found at OpenAI Platform → API Keys" },
      { key:"model",     label:"מודל מועדף",       labelEn:"Preferred Model", placeholder:"gpt-4o",              placeholderEn:"gpt-4o",              type:"text",     hint:"ברירת מחדל: gpt-4o", hintEn:"Default: gpt-4o" },
    ],
    helpSteps: [
      { step:"היכנס ל-OpenAI Platform", stepEn:"Go to OpenAI Platform", link:{ text:"platform.openai.com", textEn:"platform.openai.com", url:"https://platform.openai.com" } },
      { step:"לחץ על שמך בפינה העליונה ← API Keys", stepEn:"Click your name top-right → API Keys" },
      { step:"לחץ '+ Create new secret key' ← תן שם ← Create", stepEn:"Click '+ Create new secret key' → name it → Create" },
      { step:"העתק את המפתח (יוצג פעם אחת בלבד!)", stepEn:"Copy the key — it's shown only once!" },
      { step:"הדבק כאן ולחץ 'בדוק חיבור'", stepEn:"Paste here and click 'Test Connection'" },
    ],
  },
  {
    id: "anthropic", name: "Anthropic (Claude)", icon: "🤖", color: "#d97706", category: "ai",
    description: "מחבר ל-Claude Sonnet/Opus לניתוח GEO, SEO ויצירת תוכן חכמה",
    descriptionEn: "Connects to Claude Sonnet/Opus for GEO, SEO analysis and smart content creation",
    fields: [
      { key:"api_key", label:"מפתח API",       labelEn:"API Key",         placeholder:"sk-ant-...",           placeholderEn:"sk-ant-...",           type:"password", hint:"נמצא ב-Anthropic Console → API Keys", hintEn:"Found at Anthropic Console → API Keys" },
      { key:"model",   label:"מודל מועדף",     labelEn:"Preferred Model", placeholder:"claude-sonnet-4-6",   placeholderEn:"claude-sonnet-4-6",   type:"text",     hint:"ברירת מחדל: claude-sonnet-4-6", hintEn:"Default: claude-sonnet-4-6" },
    ],
    helpSteps: [
      { step:"היכנס ל-Anthropic Console", stepEn:"Go to Anthropic Console", link:{ text:"console.anthropic.com", textEn:"console.anthropic.com", url:"https://console.anthropic.com" } },
      { step:"בתפריט השמאלי בחר 'API Keys'", stepEn:"In the left menu select 'API Keys'" },
      { step:"לחץ '+ Create Key' ← תן שם ← Create", stepEn:"Click '+ Create Key' → name it → Create" },
      { step:"העתק את המפתח", stepEn:"Copy the key" },
      { step:"הדבק כאן ולחץ 'בדוק חיבור'", stepEn:"Paste here and click 'Test Connection'" },
    ],
  },
  /* ── Ads ─────────────────────────────────────────────────────── */
  {
    id: "google_ads", name: "Google Ads", icon: "🎯", color: "#4285f4", category: "ads",
    description: "ייבוא קמפיינים, הוצאות, המרות ונתוני ביצועים מ-Google Ads",
    descriptionEn: "Import campaigns, spend, conversions and performance data from Google Ads",
    fields: [
      { key:"customer_id",  label:"Customer ID (CID)", labelEn:"Customer ID (CID)", placeholder:"123-456-7890",       placeholderEn:"123-456-7890",       type:"text",     hint:"מספר 10 ספרות שמופיע בפינה הימנית העליונה של חשבון Google Ads", hintEn:"10-digit number shown top-right in your Google Ads account" },
      { key:"dev_token",    label:"Developer Token",   labelEn:"Developer Token",   placeholder:"ABcDef1234...",       placeholderEn:"ABcDef1234...",       type:"password", hint:"Google Ads API Center → Developer Token", hintEn:"Google Ads API Center → Developer Token" },
      { key:"oauth_id",     label:"OAuth Client ID",   labelEn:"OAuth Client ID",   placeholder:"1234...googleusercontent.com", placeholderEn:"1234...googleusercontent.com", type:"text" },
      { key:"oauth_secret", label:"OAuth Client Secret",labelEn:"OAuth Client Secret",placeholder:"GOCSPX-...",        placeholderEn:"GOCSPX-...",         type:"password" },
    ],
    helpSteps: [
      { step:"פתח את חשבון Google Ads שלך ← שים לב ל-Customer ID (CID) בפינה הימנית", stepEn:"Open your Google Ads account → note the Customer ID (CID) top-right", link:{ text:"ads.google.com", textEn:"ads.google.com", url:"https://ads.google.com" } },
      { step:"עבור ל-Google Cloud Console ← צור פרויקט חדש ← הפעל Google Ads API", stepEn:"Go to Google Cloud Console → create project → enable Google Ads API", link:{ text:"console.cloud.google.com", textEn:"console.cloud.google.com", url:"https://console.cloud.google.com" } },
      { step:"Credentials ← Create Credentials ← OAuth Client ID ← Web Application", stepEn:"Credentials → Create Credentials → OAuth Client ID → Web Application" },
      { step:"העתק Client ID ו-Client Secret", stepEn:"Copy Client ID and Client Secret" },
      { step:"ב-Google Ads: כלים ← API Center ← העתק Developer Token", stepEn:"In Google Ads: Tools → API Center → copy Developer Token" },
    ],
  },
  {
    id: "meta", name: "Meta Ads", icon: "📘", color: "#1877f2", category: "ads",
    description: "ייבוא קמפיינים, קהלים ומדדים מ-Meta Ads (Facebook + Instagram)",
    descriptionEn: "Import campaigns, audiences and metrics from Meta Ads (Facebook + Instagram)",
    fields: [
      { key:"app_id",      label:"App ID",           labelEn:"App ID",           placeholder:"1234567890",           placeholderEn:"1234567890",         type:"text",     hint:"Meta Developers → My Apps → בחר אפליקציה → App ID", hintEn:"Meta Developers → My Apps → select app → App ID" },
      { key:"app_secret",  label:"App Secret",        labelEn:"App Secret",       placeholder:"abcdef123456...",      placeholderEn:"abcdef123456...",    type:"password", hint:"Settings → Basic → App Secret", hintEn:"Settings → Basic → App Secret" },
      { key:"access_token",label:"System User Token", labelEn:"System User Token",placeholder:"EAABwzLixnjYBO...",   placeholderEn:"EAABwzLixnjYBO...", type:"password", hint:"Business Settings → System Users → Generate Token", hintEn:"Business Settings → System Users → Generate Token" },
      { key:"account_id",  label:"Ad Account ID",     labelEn:"Ad Account ID",    placeholder:"act_123456789",        placeholderEn:"act_123456789",      type:"text",     hint:"Business Manager → Ad Accounts → מספר החשבון", hintEn:"Business Manager → Ad Accounts → account number" },
    ],
    helpSteps: [
      { step:"עבור ל-Meta Business Manager ← Settings ← Ad Accounts ← רשום את Account ID", stepEn:"Go to Meta Business Manager → Settings → Ad Accounts → note Account ID", link:{ text:"business.facebook.com", textEn:"business.facebook.com", url:"https://business.facebook.com/settings" } },
      { step:"עבור ל-Meta for Developers ← צור אפליקציה חדשה מסוג 'Business'", stepEn:"Go to Meta for Developers → create new 'Business' app", link:{ text:"developers.facebook.com", textEn:"developers.facebook.com", url:"https://developers.facebook.com/apps" } },
      { step:"העתק App ID ו-App Secret מ-Settings → Basic", stepEn:"Copy App ID and App Secret from Settings → Basic" },
      { step:"Business Settings ← System Users ← Add ← Generate New Token ← בחר את כל הרשאות Ads", stepEn:"Business Settings → System Users → Add → Generate New Token → select all Ads permissions" },
      { step:"העתק את ה-System User Token והדבק כאן", stepEn:"Copy the System User Token and paste here" },
    ],
  },
  {
    id: "tiktok", name: "TikTok Ads", icon: "🎵", color: "#010101", category: "ads",
    description: "ייבוא קמפיינים ומדדים מ-TikTok for Business",
    descriptionEn: "Import campaigns and metrics from TikTok for Business",
    fields: [
      { key:"app_id",       label:"App ID",         labelEn:"App ID",        placeholder:"1234567890123",        placeholderEn:"1234567890123",     type:"text",     hint:"TikTok for Business → Developer → My Apps → App ID", hintEn:"TikTok for Business → Developer → My Apps → App ID" },
      { key:"app_secret",   label:"App Secret",     labelEn:"App Secret",    placeholder:"abc123def456...",      placeholderEn:"abc123def456...",   type:"password" },
      { key:"access_token", label:"Access Token",   labelEn:"Access Token",  placeholder:"act.eyJ...",           placeholderEn:"act.eyJ...",        type:"password", hint:"נוצר ב-Authorization → Get Access Token", hintEn:"Generated in Authorization → Get Access Token" },
      { key:"advertiser_id",label:"Advertiser ID",  labelEn:"Advertiser ID", placeholder:"1234567890123",        placeholderEn:"1234567890123",     type:"text",     hint:"TikTok Ads Manager → Account Info", hintEn:"TikTok Ads Manager → Account Info" },
    ],
    helpSteps: [
      { step:"היכנס ל-TikTok Ads Manager", stepEn:"Log in to TikTok Ads Manager", link:{ text:"ads.tiktok.com", textEn:"ads.tiktok.com", url:"https://ads.tiktok.com" } },
      { step:"הירשם כמפתח ב-TikTok for Business Portal", stepEn:"Register as developer at TikTok for Business Portal", link:{ text:"business.tiktok.com", textEn:"business.tiktok.com", url:"https://business.tiktok.com/portal/developer" } },
      { step:"צור אפליקציה חדשה ← קבל App ID ו-App Secret", stepEn:"Create new app → get App ID and App Secret" },
      { step:"Authorization → Generate Access Token עם scope: ads:read, ads:write", stepEn:"Authorization → Generate Access Token with scope: ads:read, ads:write" },
      { step:"Advertiser ID: ב-TikTok Ads Manager ← Profile ← Account Info", stepEn:"Advertiser ID: in TikTok Ads Manager → Profile → Account Info" },
    ],
  },
  /* ── eCommerce ───────────────────────────────────────────────── */
  {
    id: "woocommerce", name: "WooCommerce", icon: "🛒", color: "#96588a", category: "ecommerce",
    description: "ייבוא מוצרים, הזמנות, לקוחות ונתוני מכירות מחנות WooCommerce",
    descriptionEn: "Import products, orders, customers and sales data from WooCommerce store",
    fields: [
      { key:"store_url",      label:"כתובת החנות",     labelEn:"Store URL",       placeholder:"https://mystore.co.il", placeholderEn:"https://mystore.co.il", type:"url",      hint:"הכתובת המלאה של האתר (עם https)", hintEn:"Full store URL (including https)" },
      { key:"consumer_key",   label:"Consumer Key",    labelEn:"Consumer Key",    placeholder:"ck_abc123...",          placeholderEn:"ck_abc123...",           type:"password", hint:"WooCommerce → Settings → Advanced → REST API", hintEn:"WooCommerce → Settings → Advanced → REST API" },
      { key:"consumer_secret",label:"Consumer Secret", labelEn:"Consumer Secret", placeholder:"cs_abc123...",          placeholderEn:"cs_abc123...",           type:"password" },
    ],
    helpSteps: [
      { step:"היכנס לפאנל הניהול של WordPress שלך (/wp-admin)", stepEn:"Log into your WordPress admin panel (/wp-admin)" },
      { step:"WooCommerce ← Settings ← Advanced ← REST API", stepEn:"WooCommerce → Settings → Advanced → REST API" },
      { step:"לחץ 'Add Key' ← תן שם ← Permissions: Read/Write ← Generate API Key", stepEn:"Click 'Add Key' → name it → Permissions: Read/Write → Generate API Key", link:{ text:"WooCommerce REST API Docs", textEn:"WooCommerce REST API Docs", url:"https://woocommerce.github.io/woocommerce-rest-api-docs/" } },
      { step:"העתק את Consumer Key ו-Consumer Secret (יוצגו פעם אחת בלבד)", stepEn:"Copy Consumer Key and Consumer Secret — shown only once!" },
      { step:"הכנס את כתובת החנות, CK ו-CS כאן ← לחץ 'בדוק חיבור'", stepEn:"Enter store URL, CK and CS here → click 'Test Connection'" },
    ],
  },
  {
    id: "shopify", name: "Shopify", icon: "🛍️", color: "#96bf48", category: "ecommerce",
    description: "ייבוא מוצרים, הזמנות ומכירות מ-Shopify",
    descriptionEn: "Import products, orders and sales from Shopify",
    fields: [
      { key:"store_url",    label:"כתובת החנות",   labelEn:"Store URL",    placeholder:"mystore.myshopify.com", placeholderEn:"mystore.myshopify.com", type:"url",      hint:"כתובת Shopify המקורית (לא הדומיין המותאם)", hintEn:"Your Shopify subdomain (not the custom domain)" },
      { key:"api_key",      label:"API Key",        labelEn:"API Key",      placeholder:"abc123...",              placeholderEn:"abc123...",              type:"password", hint:"Apps → Develop Apps → Create App", hintEn:"Apps → Develop Apps → Create App" },
      { key:"access_token", label:"Access Token",   labelEn:"Access Token", placeholder:"shpat_...",              placeholderEn:"shpat_...",              type:"password" },
    ],
    helpSteps: [
      { step:"ב-Shopify Admin: Settings ← Apps and sales channels ← Develop apps", stepEn:"In Shopify Admin: Settings → Apps and sales channels → Develop apps", link:{ text:"Shopify Admin", textEn:"Shopify Admin", url:"https://admin.shopify.com" } },
      { step:"Create an app ← תן שם לאפליקציה", stepEn:"Create an app → name your app" },
      { step:"Configuration ← Admin API access scopes ← בחר: products, orders, customers", stepEn:"Configuration → Admin API access scopes → select: products, orders, customers" },
      { step:"Install app ← העתק את Admin API access token (יוצג פעם אחת!)", stepEn:"Install app → copy Admin API access token — shown once only!" },
      { step:"הדבק כאן את כתובת החנות, API Key ו-Access Token", stepEn:"Paste store URL, API Key and Access Token here" },
    ],
  },
  /* ── Analytics ───────────────────────────────────────────────── */
  {
    id: "ga4", name: "Google Analytics 4", icon: "📊", color: "#f9ab00", category: "analytics",
    description: "ייבוא נתוני תנועה, המרות ועמודים מ-GA4",
    descriptionEn: "Import traffic, conversion and page data from GA4",
    fields: [
      { key:"property_id",    label:"Property ID",      labelEn:"Property ID",      placeholder:"123456789",            placeholderEn:"123456789",          type:"text",     hint:"GA4 → Admin → Property Settings → Property ID", hintEn:"GA4 → Admin → Property Settings → Property ID" },
      { key:"measurement_id", label:"Measurement ID",   labelEn:"Measurement ID",   placeholder:"G-XXXXXXXXXX",         placeholderEn:"G-XXXXXXXXXX",       type:"text",     hint:"Data Streams → שם ה-stream → Measurement ID", hintEn:"Data Streams → stream name → Measurement ID" },
      { key:"service_json",   label:"Service Account JSON", labelEn:"Service Account JSON", placeholder:'{"type":"service_account",...}', placeholderEn:'{"type":"service_account",...}', type:"textarea", hint:"Google Cloud → IAM → Service Accounts → Create → Download JSON", hintEn:"Google Cloud → IAM → Service Accounts → Create → Download JSON" },
    ],
    helpSteps: [
      { step:"פתח Google Analytics 4 ← Admin ← Property Settings ← העתק Property ID", stepEn:"Open Google Analytics 4 → Admin → Property Settings → copy Property ID", link:{ text:"analytics.google.com", textEn:"analytics.google.com", url:"https://analytics.google.com" } },
      { step:"Google Cloud Console ← IAM & Admin ← Service Accounts ← Create Service Account", stepEn:"Google Cloud Console → IAM & Admin → Service Accounts → Create Service Account", link:{ text:"console.cloud.google.com", textEn:"console.cloud.google.com", url:"https://console.cloud.google.com/iam-admin/serviceaccounts" } },
      { step:"צור מפתח JSON ← הורד את הקובץ", stepEn:"Create JSON key → Download the file" },
      { step:"ב-GA4: Admin ← Property access management ← הוסף את ה-Service Account email עם הרשאת Viewer", stepEn:"In GA4: Admin → Property access management → add Service Account email with Viewer role" },
      { step:"הכנס את Property ID ו-Measurement ID, הדבק את תוכן ה-JSON כאן", stepEn:"Enter Property ID and Measurement ID, paste JSON content here" },
    ],
  },
  {
    id: "gsc", name: "Google Search Console", icon: "🔍", color: "#4caf50", category: "analytics",
    description: "ייבוא מילות מפתח, קליקים, חשיפות ו-CTR מ-Search Console",
    descriptionEn: "Import keywords, clicks, impressions and CTR from Search Console",
    fields: [
      { key:"site_url",     label:"כתובת הנכס",       labelEn:"Property URL",     placeholder:"https://mystore.co.il", placeholderEn:"https://mystore.co.il", type:"url",      hint:"כתובת הנכס ב-Search Console (בדיוק כפי שמופיעה)", hintEn:"Property URL in Search Console (exactly as shown)" },
      { key:"service_json", label:"Service Account JSON", labelEn:"Service Account JSON", placeholder:'{"type":"service_account",...}', placeholderEn:'{"type":"service_account",...}', type:"textarea", hint:"אותו Service Account כמו GA4 — הוסף הרשאה ב-Search Console Settings", hintEn:"Same Service Account as GA4 — add permission in Search Console Settings" },
    ],
    helpSteps: [
      { step:"פתח Google Search Console ← בחר את הנכס שלך", stepEn:"Open Google Search Console → select your property", link:{ text:"search.google.com/search-console", textEn:"search.google.com/search-console", url:"https://search.google.com/search-console" } },
      { step:"Settings ← Users and permissions ← Add User ← הכנס את ה-Service Account email", stepEn:"Settings → Users and permissions → Add User → enter Service Account email" },
      { step:"הענק הרשאת Full ← Save", stepEn:"Grant Full permission → Save" },
      { step:"Google Cloud Console: הפעל Search Console API עבור הפרויקט שלך", stepEn:"Google Cloud Console: enable Search Console API for your project", link:{ text:"console.cloud.google.com/apis", textEn:"console.cloud.google.com/apis", url:"https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" } },
      { step:"הכנס כאן את כתובת הנכס ואת ה-JSON", stepEn:"Enter property URL and JSON here" },
    ],
  },
];

/* ── Category metadata ───────────────────────────────────────────── */
const CATEGORY_META = {
  ai:        { he:"🤖 מנועי AI",         en:"🤖 AI Engines",       color: C.purple },
  ads:       { he:"📢 פלטפורמות פרסום",  en:"📢 Ad Platforms",     color: C.blue   },
  ecommerce: { he:"🛒 חנות אינטרנטית",   en:"🛒 eCommerce Store",  color: C.teal   },
  analytics: { he:"📊 אנליטיקה וSEO",    en:"📊 Analytics & SEO",  color: C.amber  },
};

/* ── State per integration ───────────────────────────────────────── */
interface IntgState {
  status: Status;
  values: Record<string, string>;
  accountName?: string;
  lastSync?: string;
  testResult?: "ok" | "fail";
  expanded: boolean;
  helpOpen: boolean;
  saving: boolean;
  testing: boolean;
}

function initState(id: string): IntgState {
  if (typeof window !== "undefined") {
    const conns = getConnections();
    const saved = conns[id];
    if (saved?.connected) {
      const fields = saved.fields ?? {};
      const accountName = fields.store_url || fields.site_url || fields.account_id || "Active connection";
      return {
        status: "connected",
        values: fields,
        accountName,
        lastSync: saved.connectedAt || new Date().toISOString(),
        expanded: false, helpOpen: false, saving: false, testing: false,
      };
    }
  }
  return { status:"disconnected", values:{}, expanded:false, helpOpen:false, saving:false, testing:false };
}

/* ── Individual connection card ──────────────────────────────────── */
function ConnectionCard({ def, lang, onSaved }: { def: IntegrationDef; lang: Lang; onSaved?: () => void }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [st, setSt] = useState<IntgState>(() => initState(def.id));

  const setField = (key: string, val: string) =>
    setSt(p => ({ ...p, values: { ...p.values, [key]: val } }));

  const toggle = () => setSt(p => ({ ...p, expanded: !p.expanded, helpOpen: false }));

  const testConnection = async () => {
    setSt(p => ({ ...p, testing: true, testResult: undefined }));
    await new Promise(r => setTimeout(r, 1600));
    const ok = Object.keys(st.values).length >= Math.min(def.fields.length - 1, 2);
    setSt(p => ({ ...p, testing: false, testResult: ok ? "ok" : "fail" }));
  };

  const save = async () => {
    setSt(p => ({ ...p, saving: true }));
    await new Promise(r => setTimeout(r, 1200));
    // Persist to localStorage
    saveConnection(def.id, st.values);
    const accountName = st.values.store_url || st.values.site_url || st.values.account_id || t("חיבור פעיל", "Active connection");
    setSt(p => ({
      ...p, saving: false, status: "connected", expanded: false,
      accountName,
      lastSync: new Date().toISOString(),
    }));
    onSaved?.();
  };

  const disconnect = () => {
    removeConnection(def.id);
    setSt({ status:"disconnected", values:{}, expanded:false, helpOpen:false, saving:false, testing:false });
    onSaved?.();
  };

  const STATUS_COLORS: Record<Status, string> = {
    connected:"#10b981", disconnected:"#94a3b8", error:"#ef4444", testing:"#f59e0b",
  };
  const STATUS_BG: Record<Status, string> = {
    connected:"#d1fae5", disconnected:"#f1f5f9", error:"#fee2e2", testing:"#fef3c7",
  };
  const STATUS_LABELS = {
    connected:    { he:"מחובר",     en:"Connected"    },
    disconnected: { he:"לא מחובר",  en:"Not Connected" },
    error:        { he:"שגיאה",     en:"Error"         },
    testing:      { he:"בודק...",   en:"Testing..."    },
  };

  const sc = STATUS_COLORS[st.status];
  const sb = STATUS_BG[st.status];
  const sl = lang === "he" ? STATUS_LABELS[st.status].he : STATUS_LABELS[st.status].en;

  return (
    <div style={{
      background: C.card,
      border: `2px solid ${st.expanded ? def.color : (st.status === "connected" ? `${def.color}44` : C.border)}`,
      borderRadius: 14,
      overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: st.expanded ? C.shadowMd : C.shadow,
    }}>
      {/* ── Compact header ───────────────────────────────────────── */}
      <div
        onClick={toggle}
        style={{ padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
      >
        {/* Icon */}
        <div style={{ width: 46, height: 46, borderRadius: 12, background: `${def.color}18`, border: `1px solid ${def.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {def.icon}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{def.name}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {st.accountName || (lang === "he" ? def.description : def.descriptionEn)}
          </div>
          {st.lastSync && (
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
              {t("סנכרון", "Synced")}: {new Date(st.lastSync).toLocaleString(lang === "he" ? "he-IL" : "en-US")}
            </div>
          )}
        </div>

        {/* Status pill + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ background: sb, border: `1px solid ${sc}33`, borderRadius: 20, padding: "3px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: sc }}>{sl}</span>
          </div>
          <span style={{ color: C.textMuted, fontSize: 16, transition: "transform 0.2s", display: "inline-block", transform: st.expanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
        </div>
      </div>

      {/* ── Expanded form ─────────────────────────────────────────── */}
      {st.expanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Help toggle */}
          <div style={{ padding: "10px 18px", background: C.pageBg, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>
              {t("פרטי חיבור", "Connection Details")} — {def.name}
            </span>
            <button
              onClick={e => { e.stopPropagation(); setSt(p => ({ ...p, helpOpen: !p.helpOpen })); }}
              style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${def.color}44`, background: st.helpOpen ? `${def.color}18` : C.card, color: def.color, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
            >
              ❓ {t("עזרה — איך מקבלים את הנתונים?", "Help — How to get credentials?")}
            </button>
          </div>

          {/* Help guide */}
          {st.helpOpen && (
            <div style={{ padding: "16px 18px", background: `${def.color}08`, borderBottom: `1px solid ${def.color}22` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: def.color, marginBottom: 14 }}>
                📋 {t("מדריך שלב-בשלב", "Step-by-Step Guide")} — {def.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {def.helpSteps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: def.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{lang === "he" ? s.step : s.stepEn}</div>
                      {s.link && (
                        <a href={s.link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: def.color, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, textDecoration: "none" }}>
                          🔗 {lang === "he" ? s.link.text : s.link.textEn}
                          <span style={{ fontSize: 10 }}>↗</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form fields */}
          <div style={{ padding: "18px 18px 0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {def.fields.map(f => {
                const isTextarea = f.type === "textarea";
                const InputEl = isTextarea ? "textarea" : "input";
                return (
                  <div key={f.key} style={{ gridColumn: isTextarea ? "span 2" : "span 1" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 5 }}>
                      {lang === "he" ? f.label : f.labelEn}
                    </label>
                    <InputEl
                      type={isTextarea ? undefined : f.type}
                      value={st.values[f.key] || ""}
                      onChange={e => setField(f.key, e.target.value)}
                      placeholder={lang === "he" ? f.placeholder : f.placeholderEn}
                      rows={isTextarea ? 3 : undefined}
                      style={{ width: "100%", padding: "9px 11px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.inputBg, color: C.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: isTextarea ? "vertical" : undefined, outline: "none" }}
                      onClick={e => e.stopPropagation()}
                    />
                    {(f.hint || f.hintEn) && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                        💡 {lang === "he" ? f.hint : f.hintEn}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test result */}
          {st.testResult && (
            <div style={{ margin: "12px 18px 0", padding: "10px 14px", borderRadius: 8, background: st.testResult === "ok" ? C.greenLight : C.redLight, border: `1px solid ${st.testResult === "ok" ? C.greenA : C.redA}`, fontSize: 13, fontWeight: 600, color: st.testResult === "ok" ? C.greenText : C.redText }}>
              {st.testResult === "ok"
                ? `✅ ${t("החיבור תקין! לחץ 'שמור' להפעלה", "Connection OK! Click 'Save' to activate")}`
                : `❌ ${t("פרטים שגויים או חסרים — בדוק שוב ועיין במדריך", "Incorrect or missing details — check again and see guide")}`}
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: "14px 18px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={e => { e.stopPropagation(); testConnection(); }}
              disabled={st.testing}
              style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${def.color}44`, background: `${def.color}11`, color: def.color, cursor: st.testing ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}
            >
              {st.testing ? `⏳ ${t("בודק...", "Testing...")}` : `🔌 ${t("בדוק חיבור", "Test Connection")}`}
            </button>
            <button
              onClick={e => { e.stopPropagation(); save(); }}
              disabled={st.saving}
              style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: st.saving ? C.border : def.color, color: st.saving ? C.textMuted : "#fff", cursor: st.saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}
            >
              {st.saving ? `⏳ ${t("שומר...", "Saving...")}` : `💾 ${t("שמור", "Save")}`}
            </button>
            {st.status === "connected" && (
              <button
                onClick={e => { e.stopPropagation(); disconnect(); }}
                style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.redLight}`, background: C.redLight, color: C.redText, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                🔌 {t("נתק", "Disconnect")}
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); toggle(); }}
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, cursor: "pointer", fontSize: 13, marginRight: "auto" }}
            >
              {t("סגור", "Close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main module ────────────────────────────────────────────────── */
export default function IntegrationsModule({ lang, onConnectionsChanged }: { lang: Lang; onConnectionsChanged?: () => void }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;

  const categories = ["ai", "ads", "ecommerce", "analytics"] as const;

  const allDefs = INTEGRATIONS;
  const connected = allDefs.filter(d => {
    // re-compute from initial state only (for summary)
    const s = initState(d.id);
    return s.status === "connected";
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Summary bar */}
      <div className="as-4col-grid">
        {[
          { label: t("מחוברים", "Connected"),    val: connected.length,                                          color: C.green,  bg: C.greenLight,  icon: "✅" },
          { label: t("לא מחוברים", "Pending"),   val: allDefs.filter(d=>initState(d.id).status==="disconnected").length, color: C.textMuted, bg: C.pageBg,   icon: "○" },
          { label: t("שגיאות", "Errors"),        val: allDefs.filter(d=>initState(d.id).status==="error").length,        color: C.red,    bg: C.redLight,    icon: "⚠️" },
          { label: t("סה\"כ", "Total"),          val: allDefs.length,                                           color: C.accent, bg: C.accentLight, icon: "🔗" },
        ].map(m => (
          <div key={m.label} className="as-card" style={{ padding: "14px 16px", background: m.bg, border: `1px solid ${m.color}22` }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{m.val}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* AI engines — highlighted at top */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.purple, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{CATEGORY_META.ai.he}</span>
          <div style={{ flex: 1, height: 1, background: `${C.purpleA2}` }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>{t("נדרש לניתוח SEO/GEO ויצירת מודעות", "Required for SEO/GEO analysis and ad generation")}</span>
        </div>
        <div style={{ background: `${C.purpleA3}`, border: `1px solid ${C.purpleA}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {INTEGRATIONS.filter(d => d.category === "ai").map(def => (
            <ConnectionCard key={def.id} def={def} lang={lang} onSaved={onConnectionsChanged} />
          ))}
        </div>
      </div>

      {/* Other categories */}
      {(["ads", "ecommerce", "analytics"] as const).map(cat => {
        const meta = CATEGORY_META[cat];
        const defs = INTEGRATIONS.filter(d => d.category === cat);
        return (
          <div key={cat}>
            <div style={{ fontSize: 13, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{lang === "he" ? meta.he : meta.en}</span>
              <div style={{ flex: 1, height: 1, background: `${meta.color}33` }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {defs.map(def => (
                <ConnectionCard key={def.id} def={def} lang={lang} onSaved={onConnectionsChanged} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
