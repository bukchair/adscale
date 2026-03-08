import { NextResponse } from "next/server";

type Status = "connected" | "partial" | "disconnected";

interface IntegrationStatus {
  name: string;
  key: string;
  status: Status;
  message: string;
  detail?: string;
}

async function checkWooCommerce(): Promise<IntegrationStatus> {
  const url = process.env.WOOCOMMERCE_URL;
  if (!url) {
    return { name: "WooCommerce", key: "WOOCOMMERCE_URL", status: "disconnected", message: "WOOCOMMERCE_URL לא מוגדר" };
  }
  try {
    const res = await fetch(`${url}/wp-json/bscale/v1/summary`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      return { name: "WooCommerce", key: "WOOCOMMERCE_URL", status: "connected", message: "מחובר", detail: url.replace(/https?:\/\//, "") };
    }
    return { name: "WooCommerce", key: "WOOCOMMERCE_URL", status: "partial", message: `שגיאת HTTP ${res.status}`, detail: "בדוק שהפלאגין מותקן" };
  } catch {
    return { name: "WooCommerce", key: "WOOCOMMERCE_URL", status: "partial", message: "לא ניתן להגיע לאתר", detail: url.replace(/https?:\/\//, "") };
  }
}

async function checkGoogleAds(): Promise<IntegrationStatus> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  const missing = [
    !clientId && "GOOGLE_CLIENT_ID",
    !clientSecret && "GOOGLE_CLIENT_SECRET",
    !refreshToken && "GOOGLE_ADS_REFRESH_TOKEN",
    !customerId && "GOOGLE_ADS_CUSTOMER_ID",
    !devToken && "GOOGLE_ADS_DEVELOPER_TOKEN",
  ].filter(Boolean);

  if (missing.length === 5) {
    return { name: "Google Ads", key: "GOOGLE_ADS_*", status: "disconnected", message: "לא מוגדר" };
  }
  if (missing.length > 0) {
    return { name: "Google Ads", key: "GOOGLE_ADS_*", status: "partial", message: "הגדרה חלקית", detail: `חסר: ${missing.join(", ")}` };
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, refresh_token: refreshToken!, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(6000),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { name: "Google Ads", key: "GOOGLE_ADS_*", status: "partial", message: "שגיאת אימות", detail: tokenData.error_description || tokenData.error || "token refresh failed" };
    }

    // Quick ping — just validate customer access
    const pingRes = await fetch(`https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "developer-token": devToken!, "login-customer-id": "2913379431", "Content-Type": "application/json" },
      body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
      signal: AbortSignal.timeout(6000),
    });

    if (pingRes.ok) {
      return { name: "Google Ads", key: "GOOGLE_ADS_*", status: "connected", message: "מחובר", detail: `חשבון: ${customerId}` };
    }
    const errText = await pingRes.text();
    return { name: "Google Ads", key: "GOOGLE_ADS_*", status: "partial", message: `HTTP ${pingRes.status}`, detail: errText.slice(0, 120) };
  } catch (e) {
    return { name: "Google Ads", key: "GOOGLE_ADS_*", status: "partial", message: "שגיאת רשת", detail: String(e).slice(0, 100) };
  }
}

async function checkMeta(): Promise<IntegrationStatus> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token && !accountId) {
    return { name: "Meta Business", key: "META_ACCESS_TOKEN", status: "disconnected", message: "לא מוגדר" };
  }
  if (!token || !accountId) {
    return { name: "Meta Business", key: "META_ACCESS_TOKEN", status: "partial", message: "הגדרה חלקית", detail: `חסר: ${!token ? "META_ACCESS_TOKEN" : "META_AD_ACCOUNT_ID"}` };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/act_${accountId}?fields=id,name,account_status&access_token=${token}`,
      { signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    if (data.error) {
      return { name: "Meta Business", key: "META_ACCESS_TOKEN", status: "partial", message: "שגיאת אימות", detail: data.error.message?.slice(0, 120) };
    }
    const statusMap: Record<number, string> = { 1: "פעיל", 2: "מושבת", 3: "לא מאומת", 7: "מבוטל" };
    return {
      name: "Meta Business", key: "META_ACCESS_TOKEN", status: "connected",
      message: "מחובר",
      detail: `${data.name || accountId} · ${statusMap[data.account_status] || ""}`,
    };
  } catch (e) {
    return { name: "Meta Business", key: "META_ACCESS_TOKEN", status: "partial", message: "שגיאת רשת", detail: String(e).slice(0, 100) };
  }
}

async function checkGA4(): Promise<IntegrationStatus> {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY;
  const propertyId = process.env.GA4_PROPERTY_ID;

  const missing = [!clientEmail && "GA4_CLIENT_EMAIL", !privateKey && "GA4_PRIVATE_KEY", !propertyId && "GA4_PROPERTY_ID"].filter(Boolean);
  if (missing.length === 3) return { name: "Google Analytics 4", key: "GA4_*", status: "disconnected", message: "לא מוגדר" };
  if (missing.length > 0) return { name: "Google Analytics 4", key: "GA4_*", status: "partial", message: "הגדרה חלקית", detail: `חסר: ${missing.join(", ")}` };

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })).toString("base64url");
    const { createSign } = await import("crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(privateKey!.replace(/\\n/g, "\n"), "base64url");
    const jwt = `${header}.${payload}.${sig}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
      signal: AbortSignal.timeout(6000),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { name: "Google Analytics 4", key: "GA4_*", status: "partial", message: "שגיאת אימות", detail: tokenData.error_description || "JWT failed" };
    }

    const ga4Res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:getMetadata`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    if (ga4Res.ok) {
      return { name: "Google Analytics 4", key: "GA4_*", status: "connected", message: "מחובר", detail: `Property: ${propertyId}` };
    }
    return { name: "Google Analytics 4", key: "GA4_*", status: "partial", message: `HTTP ${ga4Res.status}`, detail: "בדוק הרשאות" };
  } catch (e) {
    return { name: "Google Analytics 4", key: "GA4_*", status: "partial", message: "שגיאת רשת", detail: String(e).slice(0, 100) };
  }
}

async function checkSearchConsole(): Promise<IntegrationStatus> {
  const siteUrl = process.env.GSC_SITE_URL;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY;

  if (!siteUrl) return { name: "Search Console", key: "GSC_SITE_URL", status: "disconnected", message: "GSC_SITE_URL לא מוגדר" };
  if (!clientEmail || !privateKey) return { name: "Search Console", key: "GSC_SITE_URL", status: "partial", message: "Service account חסר (GA4_CLIENT_EMAIL/GA4_PRIVATE_KEY)", detail: siteUrl };

  return { name: "Search Console", key: "GSC_SITE_URL", status: "connected", message: "מוגדר", detail: siteUrl };
}

async function checkMerchant(): Promise<IntegrationStatus> {
  const merchantId = process.env.GMC_MERCHANT_ID;
  if (!merchantId) return { name: "Google Merchant Center", key: "GMC_MERCHANT_ID", status: "disconnected", message: "GMC_MERCHANT_ID לא מוגדר" };

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return { name: "Google Merchant Center", key: "GMC_MERCHANT_ID", status: "partial", message: "Google OAuth חסר", detail: `Merchant ID: ${merchantId}` };
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(6000),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { name: "Google Merchant Center", key: "GMC_MERCHANT_ID", status: "partial", message: "שגיאת אימות", detail: `Merchant ID: ${merchantId}` };
    }
    const pingRes = await fetch(`https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/accounts/${merchantId}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    if (pingRes.ok) {
      const data = await pingRes.json();
      return { name: "Google Merchant Center", key: "GMC_MERCHANT_ID", status: "connected", message: "מחובר", detail: `${data.name || merchantId}` };
    }
    return { name: "Google Merchant Center", key: "GMC_MERCHANT_ID", status: "partial", message: `HTTP ${pingRes.status}`, detail: `Merchant ID: ${merchantId}` };
  } catch (e) {
    return { name: "Google Merchant Center", key: "GMC_MERCHANT_ID", status: "partial", message: "שגיאת רשת", detail: String(e).slice(0, 100) };
  }
}

async function checkTikTok(): Promise<IntegrationStatus> {
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!advertiserId && !accessToken) {
    return { name: "TikTok Ads", key: "TIKTOK_ADVERTISER_ID", status: "disconnected", message: "לא מוגדר" };
  }
  if (!advertiserId || !accessToken) {
    return { name: "TikTok Ads", key: "TIKTOK_ADVERTISER_ID", status: "partial", message: "הגדרה חלקית", detail: `חסר: ${!advertiserId ? "TIKTOK_ADVERTISER_ID" : "TIKTOK_ACCESS_TOKEN"}` };
  }

  try {
    const res = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${advertiserId}"]`,
      { headers: { "Access-Token": accessToken }, signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    if (data.code === 0 && data.data?.list?.length > 0) {
      return { name: "TikTok Ads", key: "TIKTOK_ADVERTISER_ID", status: "connected", message: "מחובר", detail: data.data.list[0]?.advertiser_name || advertiserId };
    }
    return { name: "TikTok Ads", key: "TIKTOK_ADVERTISER_ID", status: "partial", message: data.message || "שגיאת אימות", detail: advertiserId };
  } catch (e) {
    return { name: "TikTok Ads", key: "TIKTOK_ADVERTISER_ID", status: "partial", message: "שגיאת רשת", detail: String(e).slice(0, 100) };
  }
}

export async function GET() {
  const [woo, google, meta, ga4, gsc, merchant, tiktok] = await Promise.allSettled([
    checkWooCommerce(),
    checkGoogleAds(),
    checkMeta(),
    checkGA4(),
    checkSearchConsole(),
    checkMerchant(),
    checkTikTok(),
  ]);

  const results = [woo, google, meta, ga4, gsc, merchant, tiktok].map(r =>
    r.status === "fulfilled" ? r.value : { name: "unknown", key: "", status: "disconnected" as Status, message: "שגיאה פנימית" }
  );

  const connected = results.filter(r => r.status === "connected").length;

  return NextResponse.json({
    integrations: results,
    summary: { connected, total: results.length },
    checkedAt: new Date().toISOString(),
  });
}
