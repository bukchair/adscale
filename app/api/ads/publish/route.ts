import { NextRequest, NextResponse } from "next/server";

interface PublishPayload {
  platform: "google" | "meta" | "tiktok";
  headline: string;
  description: string;
  cta: string;
  imageUrl?: string;
  targetUrl: string;
  campaignName: string;
  dailyBudget: number; // ILS
  connections: Record<string, Record<string, string>>;
}

export async function POST(req: NextRequest) {
  const body: PublishPayload = await req.json();
  const { platform } = body;

  if (platform === "google") return publishGoogle(body);
  if (platform === "meta") return publishMeta(body);
  if (platform === "tiktok") return publishTikTok(body);
  return NextResponse.json({ error: "פלטפורמה לא נתמכת" }, { status: 400 });
}

/* ─────────────────────────── GOOGLE ADS ─────────────────────────── */
async function publishGoogle(p: PublishPayload) {
  const g = p.connections.google_ads || {};
  const accessToken = g.access_token;
  const devToken = g.developer_token;
  const rawCustomerId = g.customer_id?.replace(/-/g, "") || "";

  if (!accessToken) return err("חסר Access Token לגוגל. הוסף אותו בהגדרות → Google Ads");
  if (!devToken) return err("חסר Developer Token לגוגל");
  if (!rawCustomerId) return err("חסר Customer ID לגוגל");

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  const base = `https://googleads.googleapis.com/v19/customers/${rawCustomerId}`;

  try {
    /* ── 1. Budget ── */
    const budgetMicros = p.dailyBudget * 1_000_000;
    const budgetRes = await fetch(`${base}/campaignBudgets:mutate`, {
      method: "POST", headers,
      body: JSON.stringify({
        operations: [{ create: {
          name: `${p.campaignName} Budget`,
          amountMicros: budgetMicros,
          deliveryMethod: "STANDARD",
        }}],
      }),
    });
    const budgetData = await budgetRes.json();
    if (!budgetRes.ok) return googleErr(budgetData, "שגיאה ביצירת תקציב");
    const budgetResourceName: string = budgetData.results[0].resourceName;

    /* ── 2. Campaign (Search) ── */
    const campaignResourceName: string = g.campaign_id
      ? `customers/${rawCustomerId}/campaigns/${g.campaign_id}`
      : await (async () => {
          const campRes = await fetch(`${base}/campaigns:mutate`, {
            method: "POST", headers,
            body: JSON.stringify({
              operations: [{ create: {
                name: p.campaignName,
                advertisingChannelType: "SEARCH",
                status: "PAUSED",
                campaignBudget: budgetResourceName,
                manualCpc: {},
                networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true },
              }}],
            }),
          });
          const campData = await campRes.json();
          if (!campRes.ok) throw new Error(JSON.stringify(campData));
          return campData.results[0].resourceName as string;
        })();

    /* ── 3. Ad Group ── */
    const adGroupResourceName: string = g.ad_group_id
      ? `customers/${rawCustomerId}/adGroups/${g.ad_group_id}`
      : await (async () => {
          const agRes = await fetch(`${base}/adGroups:mutate`, {
            method: "POST", headers,
            body: JSON.stringify({
              operations: [{ create: {
                name: `${p.campaignName} – Ad Group`,
                campaign: campaignResourceName,
                status: "ENABLED",
                type: "SEARCH_STANDARD",
                cpcBidMicros: 1_000_000,
              }}],
            }),
          });
          const agData = await agRes.json();
          if (!agRes.ok) throw new Error(JSON.stringify(agData));
          return agData.results[0].resourceName as string;
        })();

    /* ── 4. Responsive Search Ad ── */
    const adRes = await fetch(`${base}/adGroupAds:mutate`, {
      method: "POST", headers,
      body: JSON.stringify({
        operations: [{ create: {
          adGroup: adGroupResourceName,
          status: "ENABLED",
          ad: {
            finalUrls: [p.targetUrl],
            responsiveSearchAd: {
              headlines: [
                { text: p.headline.substring(0, 30) },
                { text: p.cta.substring(0, 30) },
                { text: (p.headline.substring(0, 15) + " | " + p.cta).substring(0, 30) },
              ],
              descriptions: [
                { text: p.description.substring(0, 90) },
                { text: p.description.substring(0, 45) },
              ],
            },
          },
        }}],
      }),
    });
    const adData = await adRes.json();
    if (!adRes.ok) return googleErr(adData, "שגיאה ביצירת מודעה");

    const adResourceName: string = adData.results[0].resourceName;
    return NextResponse.json({
      success: true,
      platform: "google",
      resourceName: adResourceName,
      message: "מודעת חיפוש נוצרה בגוגל עם סטטוס PAUSED — בדוק ב-Google Ads Manager",
    });
  } catch (e: any) {
    return err(`שגיאה בפרסום לגוגל: ${e.message}`);
  }
}

/* ─────────────────────────── META ADS ─────────────────────────── */
async function publishMeta(p: PublishPayload) {
  const m = p.connections.meta || {};
  const accessToken = m.access_token;
  const accountId = m.account_id?.replace(/^act_/, ""); // strip prefix if present
  const pageId = m.page_id;

  if (!accessToken) return err("חסר Access Token למטא. הוסף אותו בהגדרות → Meta Business");
  if (!accountId) return err("חסר Ad Account ID למטא");
  if (!pageId) return err("חסר Facebook Page ID. הוסף אותו בהגדרות → Meta Business");

  const base = "https://graph.facebook.com/v19.0";
  const actId = `act_${accountId}`;
  const dailyBudgetCents = p.dailyBudget * 100; // Meta uses cents

  try {
    /* ── 1. Campaign ── */
    const campRes = await fetch(`${base}/${actId}/campaigns`, {
      method: "POST",
      body: new URLSearchParams({
        name: p.campaignName,
        objective: "OUTCOME_TRAFFIC",
        status: "PAUSED",
        special_ad_categories: "[]",
        access_token: accessToken,
      }),
    });
    const campData = await campRes.json();
    if (campData.error) return err(`שגיאת מטא (קמפיין): ${campData.error.message}`);
    const campaignId: string = campData.id;

    /* ── 2. Ad Set ── */
    const adSetRes = await fetch(`${base}/${actId}/adsets`, {
      method: "POST",
      body: new URLSearchParams({
        name: `${p.campaignName} – Ad Set`,
        campaign_id: campaignId,
        daily_budget: String(dailyBudgetCents),
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting: JSON.stringify({ geo_locations: { countries: ["IL"] }, age_min: 18 }),
        status: "PAUSED",
        access_token: accessToken,
      }),
    });
    const adSetData = await adSetRes.json();
    if (adSetData.error) return err(`שגיאת מטא (אד-סט): ${adSetData.error.message}`);
    const adSetId: string = adSetData.id;

    /* ── 3. Ad Creative ── */
    const creativeBody: Record<string, string> = {
      name: `${p.campaignName} Creative`,
      object_story_spec: JSON.stringify({
        page_id: pageId,
        link_data: {
          message: p.description,
          link: p.targetUrl,
          name: p.headline,
          call_to_action: { type: metaCta(p.cta), value: { link: p.targetUrl } },
          ...(p.imageUrl ? { picture: p.imageUrl } : {}),
        },
      }),
      access_token: accessToken,
    };
    const creativeRes = await fetch(`${base}/${actId}/adcreatives`, {
      method: "POST", body: new URLSearchParams(creativeBody),
    });
    const creativeData = await creativeRes.json();
    if (creativeData.error) return err(`שגיאת מטא (creative): ${creativeData.error.message}`);
    const creativeId: string = creativeData.id;

    /* ── 4. Ad ── */
    const adRes = await fetch(`${base}/${actId}/ads`, {
      method: "POST",
      body: new URLSearchParams({
        name: p.campaignName,
        adset_id: adSetId,
        creative: JSON.stringify({ creative_id: creativeId }),
        status: "PAUSED",
        access_token: accessToken,
      }),
    });
    const adData = await adRes.json();
    if (adData.error) return err(`שגיאת מטא (מודעה): ${adData.error.message}`);

    return NextResponse.json({
      success: true,
      platform: "meta",
      adId: adData.id,
      campaignId,
      message: "מודעה נוצרה בפייסבוק עם סטטוס PAUSED — בדוק ב-Meta Ads Manager",
    });
  } catch (e: any) {
    return err(`שגיאה בפרסום למטא: ${e.message}`);
  }
}

/* ─────────────────────────── TIKTOK ADS ─────────────────────────── */
async function publishTikTok(p: PublishPayload) {
  const tk = p.connections.tiktok || {};
  const accessToken = tk.access_token;
  const advertiserId = tk.advertiser_id;

  if (!accessToken) return err("חסר Access Token לטיקטוק. הוסף אותו בהגדרות → TikTok Ads");
  if (!advertiserId) return err("חסר Advertiser ID לטיקטוק");

  const headers = {
    "Access-Token": accessToken,
    "Content-Type": "application/json",
  };
  const apiBase = "https://business-api.tiktok.com/open_api/v1.3";
  const dailyBudget = Math.max(p.dailyBudget, 20); // TikTok minimum is $20/day

  try {
    /* ── 1. Campaign ── */
    const campRes = await fetch(`${apiBase}/campaign/create/`, {
      method: "POST", headers,
      body: JSON.stringify({
        advertiser_id: advertiserId,
        campaign_name: p.campaignName,
        objective_type: "TRAFFIC",
        budget_mode: "BUDGET_MODE_DAY",
        budget: dailyBudget,
        operation_status: "DISABLE",
      }),
    });
    const campData = await campRes.json();
    if (campData.code !== 0) return err(`שגיאת טיקטוק (קמפיין): ${campData.message}`);
    const campaignId: string = campData.data.campaign_id;

    /* ── 2. Ad Group ── */
    const agRes = await fetch(`${apiBase}/adgroup/create/`, {
      method: "POST", headers,
      body: JSON.stringify({
        advertiser_id: advertiserId,
        campaign_id: campaignId,
        adgroup_name: `${p.campaignName} – Ad Group`,
        placement_type: "PLACEMENT_TYPE_AUTOMATIC",
        budget_mode: "BUDGET_MODE_DAY",
        budget: dailyBudget,
        schedule_type: "SCHEDULE_START_END",
        schedule_start_time: new Date().toISOString().replace("T", " ").substring(0, 19),
        schedule_end_time: new Date(Date.now() + 30 * 24 * 3600_000).toISOString().replace("T", " ").substring(0, 19),
        optimization_goal: "CLICK",
        bid_type: "BID_TYPE_NO_BID",
        location_ids: ["3000011"], // Israel
        age_groups: ["AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45_54", "AGE_55_100"],
        operation_status: "DISABLE",
      }),
    });
    const agData = await agRes.json();
    if (agData.code !== 0) return err(`שגיאת טיקטוק (אד-גרופ): ${agData.message}`);
    const adGroupId: string = agData.data.adgroup_id;

    /* ── 3. Ad ── */
    const adRes = await fetch(`${apiBase}/ad/create/`, {
      method: "POST", headers,
      body: JSON.stringify({
        advertiser_id: advertiserId,
        adgroup_id: adGroupId,
        creatives: [{
          ad_name: p.campaignName,
          ad_format: "SINGLE_IMAGE",
          ad_text: `${p.headline}\n${p.description}`,
          landing_page_url: p.targetUrl,
          call_to_action: tiktokCta(p.cta),
          ...(p.imageUrl ? { image_ids: [p.imageUrl] } : {}),
        }],
        operation_status: "DISABLE",
      }),
    });
    const adData = await adRes.json();
    if (adData.code !== 0) return err(`שגיאת טיקטוק (מודעה): ${adData.message}`);

    return NextResponse.json({
      success: true,
      platform: "tiktok",
      adId: adData.data.ad_ids?.[0],
      campaignId,
      message: "מודעה נוצרה בטיקטוק עם סטטוס כבוי — הפעל אותה ב-TikTok Ads Manager",
    });
  } catch (e: any) {
    return err(`שגיאה בפרסום לטיקטוק: ${e.message}`);
  }
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function googleErr(data: any, prefix: string) {
  const msg = data?.error?.details?.[0]?.errors?.[0]?.message ||
    data?.error?.message || JSON.stringify(data);
  return err(`${prefix}: ${msg}`);
}

function metaCta(cta: string): string {
  const map: Record<string, string> = {
    "קנה עכשיו": "SHOP_NOW", "הזמן היום": "ORDER_NOW", "הזמן עכשיו": "ORDER_NOW",
    "גלה עוד": "LEARN_MORE", "קבל הנחה": "GET_OFFER", "צפה במבצע": "GET_OFFER",
    "שופ עכשיו": "SHOP_NOW",
  };
  return map[cta] || "LEARN_MORE";
}

function tiktokCta(cta: string): string {
  const map: Record<string, string> = {
    "קנה עכשיו": "SHOP_NOW", "הזמן היום": "ORDER_NOW", "הזמן עכשיו": "ORDER_NOW",
    "גלה עוד": "LEARN_MORE", "קבל הנחה": "GET_OFFER", "צפה במבצע": "GET_OFFER",
    "שופ עכשיו": "SHOP_NOW",
  };
  return map[cta] || "LEARN_MORE";
}
