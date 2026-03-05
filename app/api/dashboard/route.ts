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

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now()-7*86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
  const url = process.env.WOOCOMMERCE_URL;
  if (!url) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });

  const apiErrors: string[] = [];

  // WooCommerce
  let totalRevenue = 0, totalConversions = 0;
  try {
    const wcRes = await fetch(url+"/wp-json/adscale/v1/summary?from="+from+"&to="+to, { signal: AbortSignal.timeout(8000) });
    if (wcRes.ok) { const d = await wcRes.json(); totalRevenue = d.totalRevenue; totalConversions = d.totalConversions; }
  } catch(e) { apiErrors.push("woocommerce"); }

  // Google Ads - summary + campaigns + daily breakdown
  let googleSpent = 0, googleClicks = 0, googleImpressions = 0, googleConversions = 0;
  const googleCampaigns: any[] = [];
  const googleDailyMap: Record<string, { spent: number; clicks: number; conversions: number }> = {};
  try {
    const accessToken = await getGoogleAdsToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const managerId = "2913379431";

    // Campaign-level query
    const campaignQuery = `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
    const gaRes = await fetch(`https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: { "Authorization": "Bearer "+accessToken, "developer-token": devToken!, "login-customer-id": managerId, "Content-Type": "application/json" },
      body: JSON.stringify({ query: campaignQuery }),
      signal: AbortSignal.timeout(8000)
    });
    if (!gaRes.ok) {
      const errText = await gaRes.text();
      apiErrors.push(`google:${gaRes.status}:${errText.slice(0,200)}`);
    } else {
      const gaData = await gaRes.json();
      (gaData.results||[]).forEach((r:any) => {
        const spent = (r.metrics?.costMicros||0) / 1000000;
        const clicks = r.metrics?.clicks||0;
        const impressions = r.metrics?.impressions||0;
        const conversions = r.metrics?.conversions||0;
        googleSpent += spent;
        googleClicks += clicks;
        googleImpressions += impressions;
        googleConversions += conversions;
        const statusMap: Record<string, string> = { ENABLED: "active", PAUSED: "paused", REMOVED: "removed" };
        googleCampaigns.push({
          id: `google_${r.campaign?.id}`,
          name: r.campaign?.name || "Google Campaign",
          platform: "google",
          status: statusMap[r.campaign?.status] || "paused",
          budget: (r.campaignBudget?.amountMicros||0) / 1000000,
          spent,
          impressions,
          clicks,
          conversions,
          revenue: 0,
          roas: 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spent / clicks : 0,
          cpa: conversions > 0 ? spent / conversions : 0,
        });
      });
    }

    // Daily breakdown query
    const dailyQuery = `SELECT segments.date, metrics.cost_micros, metrics.clicks, metrics.conversions FROM customer WHERE segments.date BETWEEN '${from}' AND '${to}'`;
    const dailyRes = await fetch(`https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: { "Authorization": "Bearer "+accessToken, "developer-token": devToken!, "login-customer-id": managerId, "Content-Type": "application/json" },
      body: JSON.stringify({ query: dailyQuery }),
      signal: AbortSignal.timeout(8000)
    });
    if (dailyRes.ok) {
      const dailyData = await dailyRes.json();
      (dailyData.results||[]).forEach((r:any) => {
        const date = r.segments?.date;
        if (!date) return;
        if (!googleDailyMap[date]) googleDailyMap[date] = { spent: 0, clicks: 0, conversions: 0 };
        googleDailyMap[date].spent += (r.metrics?.costMicros||0) / 1000000;
        googleDailyMap[date].clicks += r.metrics?.clicks||0;
        googleDailyMap[date].conversions += r.metrics?.conversions||0;
      });
    }
  } catch(e) { apiErrors.push("google"); }

  // Meta Ads - summary + campaigns
  let metaSpent = 0, metaClicks = 0, metaImpressions = 0, metaConversions = 0;
  const metaCampaigns: any[] = [];
  const metaDailyMap: Record<string, { spent: number; clicks: number; conversions: number }> = {};
  try {
    const metaToken = process.env.META_ACCESS_TOKEN;
    const metaAccountId = process.env.META_AD_ACCOUNT_ID;

    // Summary
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/act_${metaAccountId}/insights?fields=spend,clicks,impressions,actions&time_range={"since":"${from}","until":"${to}"}&access_token=${metaToken}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!metaRes.ok) {
      const errText = await metaRes.text();
      apiErrors.push(`meta:${metaRes.status}:${errText.slice(0,200)}`);
    } else {
      const metaData = await metaRes.json();
      (metaData.data||[]).forEach((d:any) => {
        metaSpent += parseFloat(d.spend||"0");
        metaClicks += parseInt(d.clicks||"0");
        metaImpressions += parseInt(d.impressions||"0");
        (d.actions||[]).forEach((a:any) => { if(a.action_type==="purchase") metaConversions += parseInt(a.value||"0"); });
      });
    }

    // Campaigns
    const metaCampRes = await fetch(
      `https://graph.facebook.com/v19.0/act_${metaAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,insights.time_range({"since":"${from}","until":"${to}"}){spend,clicks,impressions,actions}&access_token=${metaToken}&limit=50`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (metaCampRes.ok) {
      const metaCampData = await metaCampRes.json();
      (metaCampData.data||[]).forEach((c:any) => {
        const ins = c.insights?.data?.[0] || {};
        const spent = parseFloat(ins.spend||"0");
        const clicks = parseInt(ins.clicks||"0");
        const impressions = parseInt(ins.impressions||"0");
        const conversions = (ins.actions||[]).reduce((sum:number, a:any) => a.action_type==="purchase" ? sum+parseInt(a.value||"0") : sum, 0);
        const budget = parseInt(c.daily_budget||c.lifetime_budget||"0") / 100;
        const statusMap: Record<string, string> = { ACTIVE: "active", PAUSED: "paused", ARCHIVED: "removed", DELETED: "removed" };
        metaCampaigns.push({
          id: `meta_${c.id}`,
          name: c.name,
          platform: "meta",
          status: statusMap[c.status] || "paused",
          budget,
          spent,
          impressions,
          clicks,
          conversions,
          revenue: 0,
          roas: 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spent / clicks : 0,
          cpa: conversions > 0 ? spent / conversions : 0,
        });
      });
    }

    // Daily breakdown
    const metaDailyRes = await fetch(
      `https://graph.facebook.com/v19.0/act_${metaAccountId}/insights?fields=spend,clicks,actions&time_increment=1&time_range={"since":"${from}","until":"${to}"}&access_token=${metaToken}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (metaDailyRes.ok) {
      const metaDailyData = await metaDailyRes.json();
      (metaDailyData.data||[]).forEach((d:any) => {
        const date = d.date_start;
        if (!date) return;
        if (!metaDailyMap[date]) metaDailyMap[date] = { spent: 0, clicks: 0, conversions: 0 };
        metaDailyMap[date].spent += parseFloat(d.spend||"0");
        metaDailyMap[date].clicks += parseInt(d.clicks||"0");
        (d.actions||[]).forEach((a:any) => { if(a.action_type==="purchase") metaDailyMap[date].conversions += parseInt(a.value||"0"); });
      });
    }
  } catch(e) { apiErrors.push("meta"); }

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
  } catch(e) { apiErrors.push("ga4:"+String(e).slice(0,150)); }

  // Build timeSeries from daily maps
  const dates = dateRange(from, to);
  const hebrewDays = ["א","ב","ג","ד","ה","ו","ש"];
  const timeSeries = dates.map(date => {
    const gDay = googleDailyMap[date] || { spent: 0, clicks: 0, conversions: 0 };
    const mDay = metaDailyMap[date] || { spent: 0, clicks: 0, conversions: 0 };
    const totalDaySpent = gDay.spent + mDay.spent;
    const totalDayConversions = gDay.conversions + mDay.conversions;
    const dayOfWeek = new Date(date).getDay();
    return {
      date,
      day: hebrewDays[dayOfWeek],
      spent: totalDaySpent,
      revenue: 0,
      roas: 0,
      clicks: gDay.clicks + mDay.clicks,
      conversions: totalDayConversions,
    };
  });

  const totalSpent = googleSpent + metaSpent;
  const campaigns = [...googleCampaigns, ...metaCampaigns];

  return NextResponse.json({
    summary: { totalSpent, totalRevenue, avgRoas: totalSpent > 0 ? totalRevenue/totalSpent : 0, totalConversions },
    timeSeries,
    byPlatform: [
      { platform: "google", spent: googleSpent, revenue: 0, roas: 0, clicks: googleClicks, conversions: googleConversions, impressions: googleImpressions },
      { platform: "meta", spent: metaSpent, revenue: 0, roas: 0, clicks: metaClicks, conversions: metaConversions, impressions: metaImpressions },
      { platform: "tiktok", spent: 0, revenue: 0, roas: 0, clicks: 0, conversions: 0, impressions: 0 }
    ],
    campaigns,
    isLive: true,
    lastUpdated: new Date().toISOString(),
    apiErrors,
    ga4: { sessions: ga4Sessions, users: ga4Users, revenue: ga4Revenue }
  });
}
