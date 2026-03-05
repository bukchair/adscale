import { NextResponse } from "next/server";

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
  if (!data.access_token) throw new Error(`token_failed`);
  return data.access_token;
}

export async function GET() {
  const errors: string[] = [];
  const metaAudiences: any[] = [];
  const googleAudiences: any[] = [];

  // Meta Custom Audiences
  const metaToken = process.env.META_ACCESS_TOKEN;
  const metaAccountId = process.env.META_AD_ACCOUNT_ID;

  if (metaToken && metaAccountId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/act_${metaAccountId}/customaudiences?fields=id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,data_source,retention_days,lookalike_audience_ids,rule&limit=50&access_token=${metaToken}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        (data.data || []).forEach((a: any) => {
          const subtypeMap: Record<string, string> = {
            CUSTOM: "רשימת לקוחות",
            WEBSITE: "מבקרי אתר",
            APP: "משתמשי אפליקציה",
            LOOKALIKE: "לוקאלייק",
            SAVED: "שמור",
            VIDEO: "צפייה בסרטון",
            LEAD_GENERATION: "לידים",
            ENGAGEMENT: "מעורבות",
            DATA_SET: "סט נתונים",
            BAG_OF_ACCOUNTS: "חשבונות",
            MESSENGER: "מסנג'ר",
            STORE_VISIT: "ביקור בחנות",
            OFFLINE_CONVERSION: "המרה אופליין",
          };
          const sizeMin = a.approximate_count_lower_bound || 0;
          const sizeMax = a.approximate_count_upper_bound || 0;
          const sizeDisplay = sizeMax > 1000000
            ? `${(sizeMax / 1000000).toFixed(1)}M`
            : sizeMax > 1000
            ? `${Math.round(sizeMax / 1000)}K`
            : sizeMax > 0
            ? `${sizeMax.toLocaleString()}`
            : "< 1,000";
          metaAudiences.push({
            id: a.id,
            name: a.name,
            platform: "meta",
            type: subtypeMap[a.subtype] || a.subtype,
            subtype: a.subtype,
            size: sizeDisplay,
            sizeRaw: sizeMax,
            retentionDays: a.retention_days || null,
            hasLookalike: (a.lookalike_audience_ids || []).length > 0,
          });
        });
      } else {
        const err = await res.text();
        errors.push(`meta:${res.status}:${err.slice(0, 200)}`);
      }
    } catch (e) {
      errors.push(`meta:${String(e).slice(0, 150)}`);
    }
  } else {
    errors.push("meta:missing_credentials");
  }

  // Google Ads User Lists (remarketing + customer match)
  try {
    const accessToken = await getGoogleAdsToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const managerId = "2913379431";

    const query = `SELECT user_list.id, user_list.name, user_list.type, user_list.membership_size_for_display, user_list.membership_life_span, user_list.eligible_for_display FROM user_list WHERE user_list.membership_status = 'OPEN' ORDER BY user_list.membership_size_for_display DESC LIMIT 50`;
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
      const typeMap: Record<string, string> = {
        REMARKETING: "רימרקטינג",
        LOGICAL: "לוגי",
        EXTERNAL_REMARKETING: "רימרקטינג חיצוני",
        RULE_BASED: "מבוסס חוקים",
        SIMILAR_USERS: "משתמשים דומים",
        CRM_BASED: "CRM / Customer Match",
        COMBINATION: "שילוב",
      };
      (data.results || []).forEach((r: any) => {
        const size = r.userList?.membershipSizeForDisplay || 0;
        const sizeDisplay = size > 1000000
          ? `${(size / 1000000).toFixed(1)}M`
          : size > 1000
          ? `${Math.round(size / 1000)}K`
          : size > 0
          ? `${size.toLocaleString()}`
          : "< 1,000";
        googleAudiences.push({
          id: r.userList?.id,
          name: r.userList?.name,
          platform: "google",
          type: typeMap[r.userList?.type] || r.userList?.type || "רשימה",
          subtype: r.userList?.type,
          size: sizeDisplay,
          sizeRaw: size,
          retentionDays: r.userList?.membershipLifeSpan || null,
          eligibleForDisplay: r.userList?.eligibleForDisplay,
        });
      });
    } else {
      const err = await res.text();
      errors.push(`google:${res.status}:${err.slice(0, 200)}`);
    }
  } catch (e) {
    errors.push(`google:${String(e).slice(0, 150)}`);
  }

  return NextResponse.json({
    meta: metaAudiences,
    google: googleAudiences,
    total: metaAudiences.length + googleAudiences.length,
    errors,
  });
}
