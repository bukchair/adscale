import { NextRequest, NextResponse } from "next/server";

async function getGoogleAdsToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`token_failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

type Priority = "high" | "medium" | "low";
type Category = "budget" | "creative" | "bidding" | "audience" | "structure";

interface Suggestion {
  id: string;
  platform: "google" | "meta" | "tiktok";
  priority: Priority;
  category: Category;
  campaignId: string;
  campaignName: string;
  message: string;
  impact: string;
  detail: string;
  action: string;
  currentValue?: number;
  suggestedValue?: number;
}

interface CampaignData {
  id: string;
  name: string;
  platform: "google" | "meta" | "tiktok";
  status: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

function generateSuggestions(campaigns: CampaignData[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const activeCampaigns = campaigns.filter(c => c.status === "active" && c.spent > 0);
  const avgCpa = (() => {
    const withConv = activeCampaigns.filter(c => c.conversions > 0);
    if (!withConv.length) return 0;
    return withConv.reduce((s, c) => s + c.cpa, 0) / withConv.length;
  })();
  const avgRoas = (() => {
    const withConv = activeCampaigns.filter(c => c.conversions > 0);
    if (!withConv.length) return 0;
    return withConv.reduce((s, c) => s + c.roas, 0) / withConv.length;
  })();
  const avgSpend = activeCampaigns.length
    ? activeCampaigns.reduce((s, c) => s + c.spent, 0) / activeCampaigns.length
    : 0;

  for (const c of campaigns) {
    const budgetUtil = c.budget > 0 ? c.spent / c.budget : 0;

    // 1. High ROAS + high budget utilization → increase budget
    if (
      c.status === "active" &&
      c.roas > 4 &&
      c.budget > 0 &&
      budgetUtil > 0.8 &&
      c.spent > 50
    ) {
      const suggestedBudget = Math.round(c.budget * 1.25);
      const expectedRevenue = Math.round((suggestedBudget - c.budget) * c.roas);
      suggestions.push({
        id: `budget_up_${c.id}`,
        platform: c.platform,
        priority: "high",
        category: "budget",
        campaignId: c.id,
        campaignName: c.name,
        message: `הגדל תקציב יומי ב-25% — קמפיין "${c.name}" מגיע לתקרה עם ROAS גבוה`,
        impact: `+₪${expectedRevenue.toLocaleString()} הכנסה צפויה`,
        detail: `ROAS: ${c.roas.toFixed(1)}x | ניצול תקציב: ${Math.round(budgetUtil * 100)}% | תקציב מוצע: ₪${suggestedBudget.toLocaleString()}/יום`,
        action: "increase_budget",
        currentValue: c.budget,
        suggestedValue: suggestedBudget,
      });
    }

    // 2. Spend with zero conversions (waste)
    if (
      c.status === "active" &&
      c.conversions === 0 &&
      c.spent > avgSpend * 1.5 &&
      c.spent > 80
    ) {
      suggestions.push({
        id: `no_conv_${c.id}`,
        platform: c.platform,
        priority: "high",
        category: "structure",
        campaignId: c.id,
        campaignName: c.name,
        message: `השהה קמפיין "${c.name}" — הוצאה ₪${Math.round(c.spent).toLocaleString()} ללא המרות`,
        impact: `חסכון ₪${Math.round(c.spent / 30).toLocaleString()}/יום`,
        detail: `הוצאה: ₪${Math.round(c.spent).toLocaleString()} | קליקים: ${c.clicks.toLocaleString()} | המרות: 0`,
        action: "pause",
      });
    }

    // 3. Low ROAS + significant spend → reduce budget or pause
    if (
      c.status === "active" &&
      c.conversions > 0 &&
      avgRoas > 0 &&
      c.roas < avgRoas * 0.5 &&
      c.spent > 100
    ) {
      const suggestedBudget = Math.round(c.budget * 0.6);
      suggestions.push({
        id: `low_roas_${c.id}`,
        platform: c.platform,
        priority: "high",
        category: "budget",
        campaignId: c.id,
        campaignName: c.name,
        message: `הפחת תקציב לקמפיין "${c.name}" — ROAS נמוך משמעותית מהממוצע`,
        impact: `-${Math.round((1 - 0.6) * 100)}% הוצאה מבוזבזת`,
        detail: `ROAS: ${c.roas.toFixed(1)}x | ממוצע: ${avgRoas.toFixed(1)}x | תקציב מוצע: ₪${suggestedBudget.toLocaleString()}/יום`,
        action: "decrease_budget",
        currentValue: c.budget,
        suggestedValue: suggestedBudget,
      });
    }

    // 4. High CPA vs average → reduce bids
    if (
      c.status === "active" &&
      c.conversions > 0 &&
      avgCpa > 0 &&
      c.cpa > avgCpa * 2 &&
      c.spent > 80
    ) {
      const saving = Math.round((c.cpa - avgCpa) * c.conversions);
      suggestions.push({
        id: `high_cpa_${c.id}`,
        platform: c.platform,
        priority: "medium",
        category: "bidding",
        campaignId: c.id,
        campaignName: c.name,
        message: `הפחת הצעות מחיר בקמפיין "${c.name}" — CPA גבוה פי 2 מהממוצע`,
        impact: `חסכון ₪${saving.toLocaleString()} אפשרי`,
        detail: `CPA: ₪${Math.round(c.cpa).toLocaleString()} | ממוצע: ₪${Math.round(avgCpa).toLocaleString()} | עבור ל-Target CPA: ₪${Math.round(avgCpa * 1.2).toLocaleString()}`,
        action: "change_bid",
        currentValue: c.cpa,
        suggestedValue: Math.round(avgCpa * 1.2),
      });
    }

    // 5. Low CTR with high impressions → creative refresh
    if (
      c.status === "active" &&
      c.impressions > 2000 &&
      c.ctr < 0.5 &&
      c.spent > 30
    ) {
      suggestions.push({
        id: `low_ctr_${c.id}`,
        platform: c.platform,
        priority: "medium",
        category: "creative",
        campaignId: c.id,
        campaignName: c.name,
        message: `חדש קריאייטיב בקמפיין "${c.name}" — CTR נמוך מאוד`,
        impact: `+${Math.round((1.5 - c.ctr) / c.ctr * 100)}% קליקים פוטנציאלי`,
        detail: `CTR: ${c.ctr.toFixed(2)}% | חשיפות: ${c.impressions.toLocaleString()} | ממוצע ענף: ~1.5%`,
        action: "refresh_creative",
      });
    }

    // 6. Good ROAS but low CTR → scale audience
    if (
      c.status === "active" &&
      c.roas > 3 &&
      c.ctr >= 1 &&
      c.impressions < 5000 &&
      c.spent > 30
    ) {
      suggestions.push({
        id: `scale_${c.id}`,
        platform: c.platform,
        priority: "low",
        category: "audience",
        campaignId: c.id,
        campaignName: c.name,
        message: `הרחב קהל יעד בקמפיין "${c.name}" — ביצועים טובים עם פוטנציאל גדילה`,
        impact: `+50% חשיפות אפשרי`,
        detail: `ROAS: ${c.roas.toFixed(1)}x | CTR: ${c.ctr.toFixed(2)}% | חשיפות: ${c.impressions.toLocaleString()} — נמוך יחסית`,
        action: "expand_audience",
      });
    }
  }

  // Cross-platform: budget shift suggestion
  const googleCamps = activeCampaigns.filter(c => c.platform === "google");
  const metaCamps = activeCampaigns.filter(c => c.platform === "meta");
  const tiktokCamps = activeCampaigns.filter(c => c.platform === "tiktok");
  const tiktokAvgRoas = tiktokCamps.length
    ? tiktokCamps.filter(c => c.roas > 0).reduce((s, c) => s + c.roas, 0) / (tiktokCamps.filter(c => c.roas > 0).length || 1)
    : 0;
  const googleAvgRoas = googleCamps.length
    ? googleCamps.filter(c => c.roas > 0).reduce((s, c) => s + c.roas, 0) / (googleCamps.filter(c => c.roas > 0).length || 1)
    : 0;
  const metaAvgRoas = metaCamps.length
    ? metaCamps.filter(c => c.roas > 0).reduce((s, c) => s + c.roas, 0) / (metaCamps.filter(c => c.roas > 0).length || 1)
    : 0;

  if (googleAvgRoas > metaAvgRoas * 1.5 && metaAvgRoas > 0 && metaCamps.length > 0) {
    const metaTotalBudget = metaCamps.reduce((s, c) => s + c.budget, 0);
    suggestions.push({
      id: "shift_to_google",
      platform: "google",
      priority: "medium",
      category: "budget",
      campaignId: "",
      campaignName: "רב-פלטפורמה",
      message: `העבר 20% מתקציב Meta לגוגל — ROAS גוגל גבוה משמעותית`,
      impact: `+₪${Math.round(metaTotalBudget * 0.2 * (googleAvgRoas - metaAvgRoas)).toLocaleString()} הכנסה צפויה`,
      detail: `ROAS גוגל: ${googleAvgRoas.toFixed(1)}x | ROAS Meta: ${metaAvgRoas.toFixed(1)}x`,
      action: "shift_budget",
    });
  } else if (metaAvgRoas > googleAvgRoas * 1.5 && googleAvgRoas > 0 && googleCamps.length > 0) {
    const googleTotalBudget = googleCamps.reduce((s, c) => s + c.budget, 0);
    suggestions.push({
      id: "shift_to_meta",
      platform: "meta",
      priority: "medium",
      category: "budget",
      campaignId: "",
      campaignName: "רב-פלטפורמה",
      message: `העבר 20% מתקציב גוגל ל-Meta — ROAS Meta גבוה משמעותית`,
      impact: `+₪${Math.round(googleTotalBudget * 0.2 * (metaAvgRoas - googleAvgRoas)).toLocaleString()} הכנסה צפויה`,
      detail: `ROAS Meta: ${metaAvgRoas.toFixed(1)}x | ROAS גוגל: ${googleAvgRoas.toFixed(1)}x`,
      action: "shift_budget",
    });
  }

  // Sort: high → medium → low, then by platform
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.priority] - order[b.priority]);

  return suggestions;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const errors: string[] = [];
  const campaigns: CampaignData[] = [];

  // Google Ads campaigns
  try {
    const accessToken = await getGoogleAdsToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const managerId = "2913379431";

    const query = `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
    const res = await fetch(`https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": devToken!,
        "login-customer-id": managerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      (data.results || []).forEach((r: any) => {
        const spent = (r.metrics?.costMicros || 0) / 1000000;
        const clicks = r.metrics?.clicks || 0;
        const impressions = r.metrics?.impressions || 0;
        const conversions = r.metrics?.conversions || 0;
        const budget = (r.campaignBudget?.amountMicros || 0) / 1000000;
        const statusMap: Record<string, string> = { ENABLED: "active", PAUSED: "paused", REMOVED: "removed" };
        campaigns.push({
          id: `google_${r.campaign?.id}`,
          name: r.campaign?.name || "Google Campaign",
          platform: "google",
          status: statusMap[r.campaign?.status] || "paused",
          budget,
          spent,
          impressions,
          clicks,
          conversions,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spent / clicks : 0,
          cpa: conversions > 0 ? spent / conversions : 0,
          roas: 0, // Google Ads API doesn't return revenue directly; set 0
        });
      });
    } else {
      const err = await res.text();
      errors.push(`google:${res.status}:${err.slice(0, 200)}`);
    }
  } catch (e) {
    errors.push(`google:${String(e).slice(0, 150)}`);
  }

  // Meta Ads campaigns
  try {
    const metaToken = process.env.META_ACCESS_TOKEN;
    const metaAccountId = process.env.META_AD_ACCOUNT_ID;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/act_${metaAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,insights.time_range({"since":"${from}","until":"${to}"}){spend,clicks,impressions,actions,purchase_roas}&access_token=${metaToken}&limit=50`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (res.ok) {
      const data = await res.json();
      (data.data || []).forEach((c: any) => {
        const ins = c.insights?.data?.[0] || {};
        const spent = parseFloat(ins.spend || "0");
        const clicks = parseInt(ins.clicks || "0");
        const impressions = parseInt(ins.impressions || "0");
        const conversions = (ins.actions || []).reduce(
          (sum: number, a: any) => (a.action_type === "purchase" ? sum + parseInt(a.value || "0") : sum), 0
        );
        const roasArr: any[] = ins.purchase_roas || [];
        const roas = roasArr.length ? parseFloat(roasArr[0]?.value || "0") : 0;
        const budget = parseInt(c.daily_budget || c.lifetime_budget || "0") / 100;
        const statusMap: Record<string, string> = { ACTIVE: "active", PAUSED: "paused", ARCHIVED: "removed", DELETED: "removed" };
        campaigns.push({
          id: `meta_${c.id}`,
          name: c.name,
          platform: "meta",
          status: statusMap[c.status] || "paused",
          budget,
          spent,
          impressions,
          clicks,
          conversions,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spent / clicks : 0,
          cpa: conversions > 0 ? spent / conversions : 0,
          roas,
        });
      });
    } else {
      const err = await res.text();
      errors.push(`meta:${res.status}:${err.slice(0, 200)}`);
    }
  } catch (e) {
    errors.push(`meta:${String(e).slice(0, 150)}`);
  }

  // TikTok campaigns
  try {
    const tiktokToken = process.env.TIKTOK_ACCESS_TOKEN;
    const advertiserId = process.env.TIKTOK_ADVERTISER_ID;
    if (tiktokToken && advertiserId) {
      const ttHeaders = { "Access-Token": tiktokToken, "Content-Type": "application/json" };

      const campRes = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&fields=["campaign_id","campaign_name","status","budget"]&page_size=50`,
        { headers: ttHeaders, signal: AbortSignal.timeout(10000) }
      );
      const campData = campRes.ok ? await campRes.json() : { code: -1 };
      const campaignMap: Record<string, any> = {};
      if (campData.code === 0) {
        (campData.data?.list || []).forEach((c: any) => { campaignMap[c.campaign_id] = c; });
      }

      const reportRes = await fetch("https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/", {
        method: "POST",
        headers: ttHeaders,
        body: JSON.stringify({
          advertiser_id: advertiserId,
          report_type: "BASIC",
          dimensions: ["campaign_id"],
          metrics: ["spend", "clicks", "impressions", "conversion", "cpc", "ctr", "cost_per_conversion"],
          data_level: "AUCTION_CAMPAIGN",
          start_date: from,
          end_date: to,
          page_size: 50,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        if (reportData.code === 0) {
          (reportData.data?.list || []).forEach((r: any) => {
            const m = r.metrics || {};
            const d = r.dimensions || {};
            const spent = parseFloat(m.spend || "0");
            const clicks = parseInt(m.clicks || "0");
            const impressions = parseInt(m.impressions || "0");
            const conversions = parseFloat(m.conversion || "0");
            const camp = campaignMap[d.campaign_id] || {};
            const statusMap: Record<string, string> = {
              CAMPAIGN_STATUS_ENABLE: "active",
              CAMPAIGN_STATUS_DISABLE: "paused",
              CAMPAIGN_STATUS_DELETE: "removed",
            };
            campaigns.push({
              id: `tiktok_${d.campaign_id}`,
              name: camp.campaign_name || `TikTok ${d.campaign_id}`,
              platform: "tiktok",
              status: statusMap[camp.status] || "paused",
              budget: parseFloat(camp.budget || "0"),
              spent,
              impressions,
              clicks,
              conversions,
              ctr: parseFloat(m.ctr || "0"),
              cpc: parseFloat(m.cpc || "0"),
              cpa: parseFloat(m.cost_per_conversion || "0"),
              roas: 0,
            });
          });
        }
      }
    }
  } catch (e) {
    errors.push(`tiktok:${String(e).slice(0, 150)}`);
  }

  const suggestions = generateSuggestions(campaigns);

  return NextResponse.json({
    suggestions,
    analyzedCampaigns: campaigns.length,
    errors,
    generatedAt: new Date().toISOString(),
  });
}
