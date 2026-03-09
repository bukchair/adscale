"use client";
import { useState, useEffect, useCallback } from "react";
import { C } from "../theme";
import { getConnections, saveConnection, removeConnection, saveCreatorGeminiKey, CREATOR_EMAIL, getUser } from "../../lib/auth";
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
    id: "gemini", name: "Google Gemini", icon: "✨", color: "#4285f4", category: "ai",
    description: "מחבר ל-Gemini Pro לניתוח SEO, ניתוח תמונות מוצר ויצירת מודעות — מסונכרן עם WooCommerce",
    descriptionEn: "Connects to Gemini Pro for SEO analysis, product image analysis and ad generation — synced with WooCommerce",
    fields: [
      { key:"api_key", label:"מפתח API",     labelEn:"API Key",         placeholder:"AIza...",               placeholderEn:"AIza...",               type:"password", hint:"נמצא ב-Google AI Studio → Get API Key", hintEn:"Found at Google AI Studio → Get API Key" },
      { key:"model",   label:"מודל מועדף",   labelEn:"Preferred Model", placeholder:"gemini-2.0-flash",      placeholderEn:"gemini-2.0-flash",      type:"text",     hint:"ברירת מחדל: gemini-2.0-flash (מהיר וחכם)", hintEn:"Default: gemini-2.0-flash (fast and smart)" },
    ],
    helpSteps: [
      { step:"עבור ל-Google AI Studio", stepEn:"Go to Google AI Studio", link:{ text:"aistudio.google.com", textEn:"aistudio.google.com", url:"https://aistudio.google.com/apikey" } },
      { step:"לחץ 'Get API Key' ← 'Create API Key'", stepEn:"Click 'Get API Key' → 'Create API Key'" },
      { step:"בחר פרויקט Google Cloud קיים או צור חדש", stepEn:"Select an existing Google Cloud project or create new" },
      { step:"העתק את מפתח ה-API (מתחיל ב-AIza...)", stepEn:"Copy the API key (starts with AIza...)" },
      { step:"הדבק כאן ולחץ 'בדוק חיבור' — Gemini ינתח SEO ויצור מודעות", stepEn:"Paste here and click 'Test Connection' — Gemini will analyze SEO and generate ads" },
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
  /* ── Email ───────────────────────────────────────────────────── */
  {
    id: "gmail", name: "Gmail (Google)", icon: "✉️", color: "#ea4335", category: "analytics",
    description: "חבר Gmail לשליחת דוחות, עדכונים אוטומטיים והזמנות משתמשים למערכת",
    descriptionEn: "Connect Gmail to send reports, automated updates and user invitations",
    fields: [
      { key:"client_id",     label:"OAuth Client ID",     labelEn:"OAuth Client ID",     placeholder:"1234...googleusercontent.com", placeholderEn:"1234...googleusercontent.com", type:"text",     hint:"Google Cloud Console → Credentials → OAuth Client ID", hintEn:"Google Cloud Console → Credentials → OAuth Client ID" },
      { key:"client_secret", label:"OAuth Client Secret", labelEn:"OAuth Client Secret", placeholder:"GOCSPX-...",                    placeholderEn:"GOCSPX-...",                   type:"password", hint:"Google Cloud Console → Credentials → Client Secret", hintEn:"Google Cloud Console → Credentials → Client Secret" },
      { key:"sender_email",  label:"כתובת שולח",          labelEn:"Sender Email",        placeholder:"reports@yourcompany.com",       placeholderEn:"reports@yourcompany.com",      type:"text",     hint:"כתובת Gmail שממנה יישלחו הדוחות", hintEn:"Gmail address that will send reports" },
    ],
    helpSteps: [
      { step:"עבור ל-Google Cloud Console ← צור פרויקט חדש (או השתמש בקיים)", stepEn:"Go to Google Cloud Console → create a new project (or use existing)", link:{ text:"console.cloud.google.com", textEn:"console.cloud.google.com", url:"https://console.cloud.google.com" } },
      { step:"APIs & Services ← Library ← חפש 'Gmail API' ← Enable", stepEn:"APIs & Services → Library → search 'Gmail API' → Enable" },
      { step:"Credentials ← Create Credentials ← OAuth Client ID ← Web Application", stepEn:"Credentials → Create Credentials → OAuth Client ID → Web Application" },
      { step:"הוסף Authorized redirect URI: https://yourdomain.com/api/auth/gmail/callback", stepEn:"Add Authorized redirect URI: https://yourdomain.com/api/auth/gmail/callback" },
      { step:"העתק Client ID ו-Client Secret ← הכנס כאן ← לחץ 'חבר עם Google'", stepEn:"Copy Client ID and Client Secret → enter here → click 'Connect with Google'" },
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
  ai:        { he:"🤖 מנועי AI",          en:"🤖 AI Engines",        color: C.purple },
  ads:       { he:"📢 פלטפורמות פרסום",   en:"📢 Ad Platforms",      color: C.blue   },
  ecommerce: { he:"🛒 חנות אינטרנטית",    en:"🛒 eCommerce Store",   color: C.teal   },
  analytics: { he:"📊 אנליטיקה, SEO ואימייל", en:"📊 Analytics, SEO & Email", color: C.amber  },
};

const GOOGLE_IDS = new Set(["google_ads", "ga4", "gsc", "gmail"]);

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
function ConnectionCard({ def, lang, onSaved, isCreator }: { def: IntegrationDef; lang: Lang; onSaved?: () => void; isCreator?: boolean }) {
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
    // If creator is saving Gemini key, share it platform-wide
    if (def.id === "gemini" && isCreator && st.values.api_key) {
      await saveCreatorGeminiKey(st.values.api_key);
    }
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
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
            {def.name}
            {def.id === "gemini" && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: isCreator ? "#7c3aed22" : "#6366f122", color: isCreator ? "#7c3aed" : "#6366f1", border: `1px solid ${isCreator ? "#7c3aed44" : "#6366f144"}` }}>
                {isCreator ? (lang === "he" ? "👑 ברמת יוצר" : "👑 Creator Level") : (lang === "he" ? "🔗 משותף ע\"י יוצר" : "🔗 Shared by Creator")}
              </span>
            )}
          </div>
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
            {/* Gmail: show OAuth connect button prominently */}
            {def.id === "gmail" && st.status !== "connected" && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  // Simulate OAuth flow — in production this would redirect to Google OAuth
                  if (st.values.client_id && st.values.client_secret && st.values.sender_email) {
                    setSt(p => ({ ...p, saving: true }));
                    setTimeout(() => {
                      saveConnection(def.id, { ...st.values, oauth: "connected" });
                      setSt(p => ({ ...p, saving: false, status: "connected", accountName: st.values.sender_email, lastSync: new Date().toISOString(), expanded: false }));
                      onSaved?.();
                    }, 1800);
                  } else {
                    setSt(p => ({ ...p, testResult: "fail" }));
                  }
                }}
                disabled={st.saving}
                style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: st.saving ? C.border : "#ea4335", color: "#fff", cursor: st.saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}
              >
                {st.saving ? `⏳ ${t("מחבר...", "Connecting...")}` : `✉️ ${t("חבר עם Google", "Connect with Google")}`}
              </button>
            )}
            {def.id !== "gmail" && (
              <button
                onClick={e => { e.stopPropagation(); testConnection(); }}
                disabled={st.testing}
                style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${def.color}44`, background: `${def.color}11`, color: def.color, cursor: st.testing ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}
              >
                {st.testing ? `⏳ ${t("בודק...", "Testing...")}` : `🔌 ${t("בדוק חיבור", "Test Connection")}`}
              </button>
            )}
            {def.id !== "gmail" && (
              <button
                onClick={e => { e.stopPropagation(); save(); }}
                disabled={st.saving}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: st.saving ? C.border : def.color, color: st.saving ? C.textMuted : "#fff", cursor: st.saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}
              >
                {st.saving ? `⏳ ${t("שומר...", "Saving...")}` : `💾 ${t("שמור", "Save")}`}
              </button>
            )}
            {st.status === "connected" && (
              <button
                onClick={e => { e.stopPropagation(); disconnect(); }}
                style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.redLight}`, background: C.redLight, color: C.redText, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                🔌 {t("נתק", "Disconnect")}
              </button>
            )}
            {/* Gmail connected: show email actions */}
            {def.id === "gmail" && st.status === "connected" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={e => { e.stopPropagation(); alert(t("שליחת דוח שבועי... (בפיתוח)", "Sending weekly report... (coming soon)")); }}
                  style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid #ea433544`, background: "#fce8e6", color: "#c5221f", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                >
                  📊 {t("שלח דוח שבועי", "Send Weekly Report")}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); alert(t("הגדרת דוחות אוטומטיים... (בפיתוח)", "Scheduling auto reports... (coming soon)")); }}
                  style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid #ea433522`, background: "#fff", color: "#ea4335", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  ⏰ {t("תזמן דוחות", "Schedule Reports")}
                </button>
              </div>
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

/* ── Google OAuth Connect Banner ─────────────────────────────────── */
function GoogleOAuthBanner({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [connecting, setConnecting] = useState(false);

  const handleConnectGoogle = () => {
    setConnecting(true);
    // Use the dedicated google-connect endpoint which requests platform scopes
    // (adwords, analytics, webmasters, gmail) separately from login.
    // Login uses only openid/email/profile so it's never blocked by scope verification.
    window.location.href = "/api/auth/google-connect?returnTo=" + encodeURIComponent("/modules?tab=integrations");
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(66,133,244,0.12), rgba(52,168,83,0.08))",
      border: "1px solid rgba(66,133,244,0.3)",
      borderRadius: 14,
      padding: "18px 20px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          🔗 {t("חיבור Google אחיד לכל הפלטפורמות", "One-click Google connection for all platforms")}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
          {t(
            "התחבר פעם אחת עם Google ואנחנו נחבר אוטומטית את Google Ads, Analytics, Search Console ו-Gmail",
            "Connect once with Google and we'll automatically connect Google Ads, Analytics, Search Console and Gmail"
          )}
        </div>
      </div>
      <button
        onClick={handleConnectGoogle}
        disabled={connecting}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 22px",
          borderRadius: 10,
          border: "none",
          background: connecting ? C.border : "#fff",
          color: connecting ? C.textMuted : "#1e293b",
          cursor: connecting ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 700,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          flexShrink: 0,
          transition: "opacity 0.2s",
          opacity: connecting ? 0.7 : 1,
        }}
      >
        {connecting ? (
          <span style={{ display: "inline-block", width: 18, height: 18, border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.2-2.7-.5-4z" />
            <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.1 3 9.3 7.8 6.3 14.7z" />
            <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.8 14.4-4.9l-6.7-5.5C29.6 36.4 26.9 37 24 37c-5.7 0-10.6-3.1-11.7-7.5l-7 5.4C8.4 41.2 15.6 45 24 45z" />
            <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1.1 3-3.4 5.5-6.3 7.1l6.7 5.5C40.5 38 45 32 45 24c0-1.4-.2-2.7-.5-4z" />
          </svg>
        )}
        {connecting ? t("מחבר...", "Connecting...") : t("התחבר עם Google", "Connect with Google")}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Main module ────────────────────────────────────────────────── */
export default function IntegrationsModule({ lang, onConnectionsChanged }: { lang: Lang; onConnectionsChanged?: () => void }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const isCreator = typeof window !== "undefined" && getUser()?.email === CREATOR_EMAIL;
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = useCallback(() => {
    setRefreshKey(k => k + 1);
    onConnectionsChanged?.();
  }, [onConnectionsChanged]);

  const allDefs = INTEGRATIONS;
  const connected = allDefs.filter(d => {
    const s = initState(d.id);
    return s.status === "connected";
  });
  const qualityScore = Math.round((connected.length / allDefs.length) * 100);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bscale_quality_score", { detail: { score: qualityScore } }));
    }
  }, [qualityScore]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Google OAuth one-click connect */}
      <GoogleOAuthBanner lang={lang} />

      {/* Connection quality score */}
      <div style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.06))`, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>📡 {t("ציון חיבוריות", "Connection Quality Score")}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{t("מחושב על פי חיבורים פעילים ועדכניות נתונים", "Calculated from active connections and data freshness")}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: qualityScore >= 70 ? "#10b981" : qualityScore >= 40 ? "#f59e0b" : "#ef4444" }}>{qualityScore}%</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>{t("מחובר", "Connected")}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: C.textMuted }}>
          <span>✅ {connected.length} {t("פעיל", "active")}</span>
          <span>○ {allDefs.length - connected.length} {t("לא מחובר", "not connected")}</span>
        </div>
      </div>

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
        {!isCreator && (
          <div style={{ marginBottom: 8, padding: "10px 14px", borderRadius: 10, background: "#ede9fe", border: "1px solid #7c3aed33", fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
            ✨ {t("מפתח Gemini AI מוגדר ברמת יוצר המערכת ומשותף לכל המשתמשים. אין צורך להגדיר מפתח נפרד.", "The Gemini AI key is set at the system creator level and shared with all users. No separate key required.")}
          </div>
        )}
        <div style={{ background: `${C.purpleA3}`, border: `1px solid ${C.purpleA}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {INTEGRATIONS.filter(d => d.category === "ai").map(def => (
            <ConnectionCard key={def.id} def={def} lang={lang} onSaved={handleSaved} isCreator={isCreator} />
          ))}
        </div>
      </div>

      {/* Google Services group */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#4285f4", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔵 {t("חשבון Google — שירותים", "Google Account — Services")}</span>
          <div style={{ flex: 1, height: 1, background: "#4285f433" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#4285f4", padding: "2px 10px", background: "#4285f411", borderRadius: 20, border: "1px solid #4285f433" }}>
            {INTEGRATIONS.filter(d => GOOGLE_IDS.has(d.id) && initState(d.id).status === "connected").length}/{GOOGLE_IDS.size} {t("מחוברים", "connected")}
          </span>
        </div>
        <div style={{ background: "#4285f408", border: "1px solid #4285f422", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {INTEGRATIONS.filter(d => GOOGLE_IDS.has(d.id)).map(def => (
            <ConnectionCard key={def.id} def={def} lang={lang} onSaved={handleSaved} isCreator={isCreator} />
          ))}
        </div>
      </div>

      {/* Other categories */}
      {(["ads", "ecommerce", "analytics"] as const).map(cat => {
        const meta = CATEGORY_META[cat];
        const defs = INTEGRATIONS.filter(d => d.category === cat && !GOOGLE_IDS.has(d.id));
        if (defs.length === 0) return null;
        return (
          <div key={cat}>
            <div style={{ fontSize: 13, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{lang === "he" ? meta.he : meta.en}</span>
              <div style={{ flex: 1, height: 1, background: `${meta.color}33` }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {defs.map(def => (
                <ConnectionCard key={def.id} def={def} lang={lang} onSaved={handleSaved} isCreator={isCreator} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
