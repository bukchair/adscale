import { NextRequest, NextResponse } from "next/server";
import { readSettings, resolve } from "@/app/lib/settings";

export async function POST(req: NextRequest) {
  const { service, credentials = {} } = await req.json();
  const s = readSettings();

  try {
    switch (service) {
      case "woocommerce": {
        const url = resolve(credentials.url, s.woocommerce?.url, "WOOCOMMERCE_URL");
        if (!url) return NextResponse.json({ success: false, message: "URL לא מוגדר" });
        const res = await fetch(`${url}/wp-json/wc/v3`, { signal: AbortSignal.timeout(6000) });
        if (res.ok || res.status === 401) {
          return NextResponse.json({ success: true, message: "✓ חיבור תקין לחנות WooCommerce" });
        }
        return NextResponse.json({ success: false, message: `שגיאה ${res.status} — בדוק שה-URL נכון` });
      }

      case "googleAds": {
        const clientId = resolve(credentials.clientId, s.googleAds?.clientId, "GOOGLE_CLIENT_ID");
        const clientSecret = resolve(credentials.clientSecret, s.googleAds?.clientSecret, "GOOGLE_CLIENT_SECRET");
        const refreshToken = resolve(credentials.refreshToken, s.googleAds?.refreshToken, "GOOGLE_ADS_REFRESH_TOKEN");
        const customerId = resolve(credentials.customerId, s.googleAds?.customerId, "GOOGLE_ADS_CUSTOMER_ID");
        const developerToken = resolve(credentials.developerToken, s.googleAds?.developerToken, "GOOGLE_ADS_DEVELOPER_TOKEN");
        const managerId = resolve(credentials.managerId, s.googleAds?.managerId, "GOOGLE_ADS_MANAGER_ID") || "2913379431";

        if (!clientId || !clientSecret || !refreshToken) {
          return NextResponse.json({ success: false, message: "חסרים Client ID, Client Secret, או Refresh Token" });
        }
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
          signal: AbortSignal.timeout(6000),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
          return NextResponse.json({ success: false, message: "Token שגוי: " + (tokenData.error_description || tokenData.error || "OAuth error") });
        }
        if (!customerId || !developerToken) {
          return NextResponse.json({ success: true, message: "✓ OAuth תקין — השלם Customer ID ו-Developer Token" });
        }
        const apiRes = await fetch(`https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`, {
          method: "POST",
          headers: { "Authorization": "Bearer " + tokenData.access_token, "developer-token": developerToken, "login-customer-id": managerId, "Content-Type": "application/json" },
          body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
          signal: AbortSignal.timeout(6000),
        });
        if (apiRes.ok) return NextResponse.json({ success: true, message: "✓ חיבור Google Ads תקין" });
        const errText = await apiRes.text();
        return NextResponse.json({ success: false, message: `API error ${apiRes.status}: ${errText.slice(0, 120)}` });
      }

      case "meta": {
        const accessToken = resolve(credentials.accessToken, s.meta?.accessToken, "META_ACCESS_TOKEN");
        const adAccountId = resolve(credentials.adAccountId, s.meta?.adAccountId, "META_AD_ACCOUNT_ID");
        if (!accessToken || !adAccountId) return NextResponse.json({ success: false, message: "חסרים Access Token ו-Ad Account ID" });
        const res = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}?fields=id,name&access_token=${accessToken}`, { signal: AbortSignal.timeout(6000) });
        const data = await res.json();
        if (data.id) return NextResponse.json({ success: true, message: `✓ חיבור Meta תקין: ${data.name || data.id}` });
        return NextResponse.json({ success: false, message: data.error?.message || `שגיאה ${res.status}` });
      }

      case "tiktok": {
        const advertiserId = resolve(credentials.advertiserId, s.tiktok?.advertiserId, "TIKTOK_ADVERTISER_ID");
        const accessToken = resolve(credentials.accessToken, s.tiktok?.accessToken, "TIKTOK_ACCESS_TOKEN");
        if (!advertiserId || !accessToken) return NextResponse.json({ success: false, message: "חסרים Advertiser ID ו-Access Token" });
        const res = await fetch(`https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${advertiserId}"]`, {
          headers: { "Access-Token": accessToken },
          signal: AbortSignal.timeout(6000),
        });
        const data = await res.json();
        if (data.code === 0) return NextResponse.json({ success: true, message: "✓ חיבור TikTok תקין" });
        return NextResponse.json({ success: false, message: data.message || `שגיאה ${res.status}` });
      }

      case "ga4": {
        const propertyId = resolve(credentials.propertyId, s.ga4?.propertyId, "GA4_PROPERTY_ID");
        const clientEmail = resolve(credentials.clientEmail, s.ga4?.clientEmail, "GA4_CLIENT_EMAIL");
        const privateKeyRaw = resolve(credentials.privateKey, s.ga4?.privateKey, "GA4_PRIVATE_KEY");
        if (!clientEmail || !privateKeyRaw || !propertyId) {
          return NextResponse.json({ success: false, message: "חסרים Property ID, Service Account Email, או Private Key" });
        }
        const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })).toString("base64url");
        const { createSign } = await import("crypto");
        const sign = createSign("RSA-SHA256");
        sign.update(`${header}.${payload}`);
        const signature = sign.sign(privateKey, "base64url");
        const jwt = `${header}.${payload}.${signature}`;
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
          signal: AbortSignal.timeout(6000),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
          return NextResponse.json({ success: false, message: "Service Account שגוי: " + (tokenData.error_description || tokenData.error || "JWT error") });
        }
        return NextResponse.json({ success: true, message: `✓ חיבור GA4 תקין (Property: ${propertyId})` });
      }

      case "gmc": {
        return NextResponse.json({ success: false, message: "בדיקת חיבור Google Merchant Center בפיתוח" });
      }

      case "gsc": {
        const siteUrl = resolve(credentials.siteUrl, s.gsc?.siteUrl, "GSC_SITE_URL");
        if (!siteUrl) return NextResponse.json({ success: false, message: "Site URL לא מוגדר" });
        return NextResponse.json({ success: true, message: `✓ Search Console מוגדר: ${siteUrl}` });
      }

      default:
        return NextResponse.json({ success: false, message: "שירות לא מוכר" });
    }
  } catch (e) {
    return NextResponse.json({ success: false, message: "שגיאת רשת: " + String(e).slice(0, 100) });
  }
}
