import { NextRequest, NextResponse } from "next/server";

async function getGoogleAdsToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token"
    })
  });
  const data = await res.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now()-7*86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
  const url = process.env.WOOCOMMERCE_URL;
  if (!url) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });

  // WooCommerce
  let totalRevenue = 0, totalConversions = 0;
  try {
    const wcRes = await fetch(url+"/wp-json/adscale/v1/summary?from="+from+"&to="+to, { signal: AbortSignal.timeout(8000) });
    if (wcRes.ok) { const d = await wcRes.json(); totalRevenue = d.totalRevenue; totalConversions = d.totalConversions; }
  } catch(e) {}

  // Google Ads
  let googleSpent = 0, googleClicks = 0, googleImpressions = 0, googleConversions = 0;
  try {
    const accessToken = await getGoogleAdsToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const managerId = "2913379431";
    const query = `SELECT campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
    const gaRes = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: { "Authorization": "Bearer "+accessToken, "developer-token": devToken!, "login-customer-id": managerId, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000)
    });
    if (gaRes.ok) {
      const gaData = await gaRes.json();
      (gaData.results||[]).forEach((r:any) => {
        googleSpent += (r.metrics?.costMicros||0) / 1000000;
        googleClicks += r.metrics?.clicks||0;
        googleImpressions += r.metrics?.impressions||0;
        googleConversions += r.metrics?.conversions||0;
      });
    }
  } catch(e) {}

  // Meta Ads
  let metaSpent = 0, metaClicks = 0, metaImpressions = 0, metaConversions = 0;
  try {
    const metaToken = process.env.META_ACCESS_TOKEN;
    const metaAccountId = process.env.META_AD_ACCOUNT_ID;
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/act_${metaAccountId}/insights?fields=spend,clicks,impressions,actions&time_range={"since":"${from}","until":"${to}"}&access_token=${metaToken}`, { signal: AbortSignal.timeout(8000) });
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      (metaData.data||[]).forEach((d:any) => {
        metaSpent += parseFloat(d.spend||"0");
        metaClicks += parseInt(d.clicks||"0");
        metaImpressions += parseInt(d.impressions||"0");
        (d.actions||[]).forEach((a:any) => { if(a.action_type==="purchase") metaConversions += parseInt(a.value||"0"); });
      });
    }
  } catch(e) {}

  // GA4
  let ga4Sessions = 0, ga4Users = 0, ga4Revenue = 0;
  try {
    const clientEmail = process.env.GA4_CLIENT_EMAIL!;
    const privateKey = process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const propertyId = process.env.GA4_PROPERTY_ID!;
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })).toString('base64url');
    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey, 'base64url');
    const jwt = `${header}.${payload}.${signature}`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
    const tokenData = await tokenRes.json();
    const ga4Res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, { method: "POST", headers: { "Authorization": "Bearer " + tokenData.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ dateRanges: [{ startDate: from, endDate: to }], metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "purchaseRevenue" }] }), signal: AbortSignal.timeout(8000) });
    if (ga4Res.ok) { const ga4Data = await ga4Res.json(); const row = ga4Data.rows?.[0]?.metricValues; if (row) { ga4Sessions = parseFloat(row[0]?.value||"0"); ga4Users = parseFloat(row[1]?.value||"0"); ga4Revenue = parseFloat(row[2]?.value||"0"); } }
  } catch(e) {}

  const totalSpent = googleSpent + metaSpent;
  return NextResponse.json({
    summary: { totalSpent, totalRevenue, avgRoas: totalSpent > 0 ? totalRevenue/totalSpent : 0, totalConversions },
    timeSeries: [],
    byPlatform: [
      { platform: "google", spent: googleSpent, revenue: 0, roas: 0, clicks: googleClicks, conversions: googleConversions, impressions: googleImpressions },
      { platform: "meta", spent: metaSpent, revenue: 0, roas: 0, clicks: metaClicks, conversions: metaConversions, impressions: metaImpressions },
      { platform: "tiktok", spent: 0, revenue: 0, roas: 0, clicks: 0, conversions: 0, impressions: 0 }
    ],
    campaigns: [],
    isLive: true,
    lastUpdated: new Date().toISOString(),
    apiErrors: [],
    ga4: { sessions: ga4Sessions, users: ga4Users, revenue: ga4Revenue }
  });
}
