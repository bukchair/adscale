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
  
  // WooCommerce
  const url = process.env.WOOCOMMERCE_URL;
  if (!url) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  
  let totalRevenue = 0, totalConversions = 0;
  try {
    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET;
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
    const gaRes = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`, {
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

  return NextResponse.json({
    summary: { totalSpent: googleSpent, totalRevenue, avgRoas: googleSpent > 0 ? totalRevenue/googleSpent : 0, totalConversions },
    timeSeries: [],
    byPlatform: [
      { platform: "google", spent: googleSpent, revenue: totalRevenue, roas: googleSpent > 0 ? totalRevenue/googleSpent : 0, clicks: googleClicks, conversions: googleConversions, impressions: googleImpressions },
      { platform: "meta", spent: 0, revenue: 0, roas: 0, clicks: 0, conversions: 0, impressions: 0 },
      { platform: "tiktok", spent: 0, revenue: 0, roas: 0, clicks: 0, conversions: 0, impressions: 0 }
    ],
    campaigns: [],
    isLive: true,
    lastUpdated: new Date().toISOString(),
    apiErrors: []
  });
}
