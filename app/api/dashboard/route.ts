// src/app/api/dashboard/route.ts
// נקודת API מרכזית – מאחד את כל הפלטפורמות

import { NextRequest, NextResponse } from "next/server";

// ── עזר: תאריכים ───────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── שליפת Google Ads ────────────────────────────────────────────
async function fetchGoogle(from: string, to: string) {
  const { GoogleAdsApi } = await import("google-ads-api");
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });

  const [campaigns, timeSeries] = await Promise.all([
    customer.query(`
      SELECT campaign.id, campaign.name, campaign.status,
             campaign_budget.amount_micros,
             metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC LIMIT 50
    `),
    customer.query(`
      SELECT segments.date, metrics.cost_micros, metrics.conversions_value,
             metrics.clicks, metrics.impressions, metrics.conversions
      FROM customer
      WHERE segments.date BETWEEN '${from}' AND '${to}'
      ORDER BY segments.date ASC
    `),
  ]);

  const mapCampaign = (row: any) => {
    const spent = (row.metrics.cost_micros || 0) / 1e6;
    const revenue = row.metrics.conversions_value || 0;
    const conversions = row.metrics.conversions || 0;
    return {
      id: `google_${row.campaign.id}`, name: row.campaign.name, platform: "google",
      status: ({ ENABLED:"active", PAUSED:"paused", REMOVED:"removed" } as any)[row.campaign.status] || "paused",
      budget: (row.campaign_budget?.amount_micros || 0) / 1e6, spent,
      impressions: row.metrics.impressions || 0, clicks: row.metrics.clicks || 0,
      conversions, revenue,
      roas: spent > 0 ? revenue / spent : 0,
      ctr: row.metrics.ctr || 0, cpc: (row.metrics.average_cpc || 0) / 1e6,
      cpa: conversions > 0 ? spent / conversions : 0, currency: "ILS",
    };
  };

  return {
    campaigns: campaigns.map(mapCampaign),
    timeSeries: timeSeries.map((row: any) => {
      const spent = (row.metrics.cost_micros || 0) / 1e6;
      const revenue = row.metrics.conversions_value || 0;
      return { date: row.segments.date, spent, revenue, roas: spent > 0 ? +(revenue/spent).toFixed(2) : 0, clicks: row.metrics.clicks || 0, conversions: row.metrics.conversions || 0 };
    }),
  };
}

// ── שליפת Meta ─────────────────────────────────────────────────
async function fetchMeta(from: string, to: string) {
  const BASE = "https://graph.facebook.com/v19.0";
  const TOKEN = process.env.META_ACCESS_TOKEN!;
  const ACCOUNT = process.env.META_AD_ACCOUNT_ID!;

  const get = async (path: string, params: Record<string,string> = {}) => {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("access_token", TOKEN);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
    const r = await fetch(url.toString()); if (!r.ok) throw new Error(await r.text());
    return r.json();
  };

  const getAction = (actions: any[], type: string) =>
    +(actions?.find((a:any) => a.action_type === type)?.value || 0);

  const [{ data: camps }, { data: insights }, { data: daily }] = await Promise.all([
    get(`/${ACCOUNT}/campaigns`, { fields: "id,name,status,daily_budget,lifetime_budget", limit: "50" }),
    get(`/${ACCOUNT}/insights`, { fields: "campaign_id,spend,impressions,clicks,actions,action_values,ctr,cpc", level: "campaign", time_range: JSON.stringify({ since: from, until: to }), limit: "50" }),
    get(`/${ACCOUNT}/insights`, { fields: "date_start,spend,clicks,actions,action_values", level: "account", time_increment: "1", time_range: JSON.stringify({ since: from, until: to }) }),
  ]);

  const insMap = new Map(insights.map((i: any) => [i.campaign_id, i]));

  return {
    campaigns: camps.map((c: any) => {
      const ins: any = insMap.get(c.id) || {};
      const spent = +( ins.spend || 0);
      const revenue = getAction(ins.action_values, "purchase");
      const conversions = getAction(ins.actions, "purchase");
      return {
        id: `meta_${c.id}`, name: c.name, platform: "meta",
        status: ({ ACTIVE:"active", PAUSED:"paused", DELETED:"removed", ARCHIVED:"removed" } as any)[c.status] || "paused",
        budget: +(c.daily_budget || c.lifetime_budget || 0) / 100,
        spent, impressions: +(ins.impressions||0), clicks: +(ins.clicks||0),
        conversions, revenue, roas: spent > 0 ? revenue/spent : 0,
        ctr: +(ins.ctr||0), cpc: +(ins.cpc||0), cpa: conversions > 0 ? spent/conversions : 0, currency: "ILS",
      };
    }),
    timeSeries: daily.map((row: any) => {
      const spent = +(row.spend||0);
      const revenue = getAction(row.action_values, "purchase");
      return { date: row.date_start, spent, revenue, roas: spent > 0 ? +(revenue/spent).toFixed(2) : 0, clicks: +(row.clicks||0), conversions: getAction(row.actions, "purchase") };
    }),
  };
}

// ── שליפת TikTok ───────────────────────────────────────────────
async function fetchTikTok(from: string, to: string) {
  const BASE = "https://business-api.tiktok.com/open_api/v1.3";
  const tFetch = async (path: string, params: Record<string,any> = {}) => {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("advertiser_id", process.env.TIKTOK_ADVERTISER_ID!);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, typeof v==="object" ? JSON.stringify(v) : String(v)));
    const r = await fetch(url.toString(), { headers: { "Access-Token": process.env.TIKTOK_ACCESS_TOKEN! } });
    const j = await r.json(); if (j.code !== 0) throw new Error(j.message);
    return j.data;
  };

  const [campData, reportData, dailyData] = await Promise.all([
    tFetch("/campaign/get/", { page_size: 50, fields: JSON.stringify(["campaign_id","campaign_name","status","budget"]) }),
    tFetch("/report/integrated/get/", { report_type:"BASIC", dimensions: JSON.stringify(["campaign_id"]), metrics: JSON.stringify(["spend","impressions","clicks","conversion","value","ctr","cpc","cost_per_conversion"]), start_date: from, end_date: to, page_size: 50 }),
    tFetch("/report/integrated/get/", { report_type:"BASIC", dimensions: JSON.stringify(["stat_time_day"]), metrics: JSON.stringify(["spend","value","clicks","conversion"]), start_date: from, end_date: to, page_size: 100 }),
  ]);

  const metricsMap = new Map((reportData.list||[]).map((r:any) => [r.dimensions.campaign_id, r.metrics]));

  return {
    campaigns: (campData.list||[]).map((c: any) => {
      const m: any = metricsMap.get(c.campaign_id) || {};
      const spent = +(m.spend||0), revenue = +(m.value||0), conversions = +(m.conversion||0);
      return {
        id: `tiktok_${c.campaign_id}`, name: c.campaign_name, platform: "tiktok",
        status: ({ CAMPAIGN_STATUS_ENABLE:"active", CAMPAIGN_STATUS_DISABLE:"paused", CAMPAIGN_STATUS_DELETE:"removed" } as any)[c.status] || "paused",
        budget: +(c.budget||0), spent, impressions: +(m.impressions||0), clicks: +(m.clicks||0),
        conversions, revenue, roas: spent > 0 ? revenue/spent : 0,
        ctr: +(m.ctr||0), cpc: +(m.cpc||0), cpa: +(m.cost_per_conversion||0), currency: "ILS",
      };
    }),
    timeSeries: (dailyData.list||[]).map((row: any) => {
      const spent = +(row.metrics.spend||0), revenue = +(row.metrics.value||0);
      return { date: row.dimensions.stat_time_day.split(" ")[0], spent, revenue, roas: spent > 0 ? +(revenue/spent).toFixed(2) : 0, clicks: +(row.metrics.clicks||0), conversions: +(row.metrics.conversion||0) };
    }),
  };
}

// ── buildPlatformSummary ────────────────────────────────────────
function buildSummary(campaigns: any[]) {
  const spent = campaigns.reduce((s,c) => s+c.spent, 0);
  const revenue = campaigns.reduce((s,c) => s+c.revenue, 0);
  return { spent, revenue, conversions: campaigns.reduce((s,c) => s+c.conversions, 0), roas: spent > 0 ? +(revenue/spent).toFixed(2) : 0, activeCampaigns: campaigns.filter(c=>c.status==="active").length };
}

// ── MAIN HANDLER ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from") || daysAgo(7);
    const to   = searchParams.get("to")   || today();

    // שליפה מקבילית – לא נעצור אם פלטפורמה אחת נכשלת
    const [googleRes, metaRes, tiktokRes] = await Promise.allSettled([
      fetchGoogle(from, to),
      fetchMeta(from, to),
      fetchTikTok(from, to),
    ]);

    const googleOk = googleRes.status === "fulfilled";
    const metaOk   = metaRes.status === "fulfilled";
    const tiktokOk = tiktokRes.status === "fulfilled";

    const googleCampaigns   = googleOk ? (googleRes.value as any).campaigns : [];
    const metaCampaigns     = metaOk   ? (metaRes.value as any).campaigns   : [];
    const tiktokCampaigns   = tiktokOk ? (tiktokRes.value as any).campaigns : [];
    const googleTimeSeries  = googleOk ? (googleRes.value as any).timeSeries : [];
    const metaTimeSeries    = metaOk   ? (metaRes.value as any).timeSeries   : [];
    const tiktokTimeSeries  = tiktokOk ? (tiktokRes.value as any).timeSeries : [];

    const allCampaigns = [...googleCampaigns, ...metaCampaigns, ...tiktokCampaigns];

    // מיזוג time series לפי תאריך
    const tsMap = new Map<string, any>();
    const mergeSeries = (series: any[]) => series.forEach(row => {
      const ex = tsMap.get(row.date) || { date: row.date, spent: 0, revenue: 0, clicks: 0, conversions: 0 };
      tsMap.set(row.date, { date: row.date, spent: ex.spent+row.spent, revenue: ex.revenue+row.revenue, clicks: ex.clicks+row.clicks, conversions: ex.conversions+row.conversions });
    });
    mergeSeries(googleTimeSeries); mergeSeries(metaTimeSeries); mergeSeries(tiktokTimeSeries);

    const timeSeries = Array.from(tsMap.values())
      .map(r => ({ ...r, roas: r.spent > 0 ? +(r.revenue/r.spent).toFixed(2) : 0 }))
      .sort((a,b) => a.date.localeCompare(b.date));

    const totalSpent   = allCampaigns.reduce((s,c) => s+c.spent, 0);
    const totalRevenue = allCampaigns.reduce((s,c) => s+c.revenue, 0);

    const errors: Record<string,string> = {};
    if (!googleOk) errors.google = (googleRes as any).reason?.message;
    if (!metaOk)   errors.meta   = (metaRes as any).reason?.message;
    if (!tiktokOk) errors.tiktok = (tiktokRes as any).reason?.message;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSpent, totalRevenue,
          totalConversions: allCampaigns.reduce((s,c) => s+c.conversions, 0),
          avgRoas: totalSpent > 0 ? +(totalRevenue/totalSpent).toFixed(2) : 0,
          campaigns: allCampaigns,
          byPlatform: { google: buildSummary(googleCampaigns), meta: buildSummary(metaCampaigns), tiktok: buildSummary(tiktokCampaigns), woocommerce: { spent:0,revenue:0,conversions:0,roas:0,activeCampaigns:0 } },
        },
        timeSeries,
        errors,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
