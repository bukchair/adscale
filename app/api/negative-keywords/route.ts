import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsToken, MANAGER_ID } from "@/app/lib/google-ads";

async function getServiceAccountToken(scope: string) {
  const clientEmail = process.env.GA4_CLIENT_EMAIL!;
  const privateKey = process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: clientEmail, scope, aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })
  ).toString("base64url");
  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");
  const jwt = `${header}.${payload}.${signature}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token as string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const errors: string[] = [];
  const terms: {
    term: string;
    source: "google_ads" | "search_console";
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    reason: string;
    score: number;
  }[] = [];
  let existingList: { id: string; name: string } | null = null;

  // ── Google Ads – search terms report ───────────────────────────────────────
  try {
    const accessToken = await getGoogleAdsToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
    const headers = {
      Authorization: "Bearer " + accessToken,
      "developer-token": devToken,
      "login-customer-id": MANAGER_ID,
      "Content-Type": "application/json",
    };

    const stQuery = `
      SELECT search_term_view.search_term,
             metrics.impressions, metrics.clicks,
             metrics.cost_micros, metrics.conversions
      FROM search_term_view
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND metrics.impressions > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT 1000`;

    const stRes = await fetch(
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
      { method: "POST", headers, body: JSON.stringify({ query: stQuery }), signal: AbortSignal.timeout(12000) }
    );

    if (!stRes.ok) {
      errors.push("google_ads:" + stRes.status + ":" + (await stRes.text()).slice(0, 150));
    } else {
      const stData = await stRes.json();
      const results: any[] = stData.results || [];

      const totalCost = results.reduce((s, r) => s + (r.metrics?.costMicros || 0) / 1_000_000, 0);
      const avgCost = totalCost / Math.max(1, results.length);

      results.forEach((r) => {
        const term: string = r.searchTermView?.searchTerm;
        if (!term) return;
        const impressions = Number(r.metrics?.impressions || 0);
        const clicks = Number(r.metrics?.clicks || 0);
        const cost = (r.metrics?.costMicros || 0) / 1_000_000;
        const conversions = Number(r.metrics?.conversions || 0);

        if (conversions > 0) return;

        let reason = "";
        let score = 0;

        if (cost > avgCost * 3) {
          reason = "עלות גבוהה מאוד ללא המרות";
          score = 95;
        } else if (cost > avgCost) {
          reason = "עלות מעל הממוצע ללא המרות";
          score = 80;
        } else if (cost > 0 && cost > avgCost * 0.4) {
          reason = "הוצאה ללא המרות";
          score = 65;
        } else if (impressions > 200 && clicks === 0) {
          reason = "חשיפות רבות ללא קליקים";
          score = 58;
        } else if (impressions > 80 && clicks === 0) {
          reason = "חשיפות ללא קליקים";
          score = 45;
        }

        if (reason) {
          terms.push({
            term,
            source: "google_ads",
            impressions,
            clicks,
            cost: Math.round(cost * 100) / 100,
            conversions,
            reason,
            score,
          });
        }
      });
    }

    // Find existing AdScale negative keyword list
    const listQuery = `
      SELECT shared_set.id, shared_set.name
      FROM shared_set
      WHERE shared_set.type = 'NEGATIVE_KEYWORDS'
        AND shared_set.status != 'REMOVED'`;

    const listRes = await fetch(
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
      { method: "POST", headers, body: JSON.stringify({ query: listQuery }), signal: AbortSignal.timeout(8000) }
    );

    if (listRes.ok) {
      const listData = await listRes.json();
      const found = (listData.results || []).find((r: any) => r.sharedSet?.name?.includes("AdScale"));
      if (found) existingList = { id: found.sharedSet.id, name: found.sharedSet.name };
    }
  } catch (e) {
    errors.push("google_ads:" + String(e).slice(0, 120));
  }

  // ── Google Search Console ──────────────────────────────────────────────────
  try {
    const siteUrl = process.env.GSC_SITE_URL;
    if (siteUrl && process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY) {
      const token = await getServiceAccountToken("https://www.googleapis.com/auth/webmasters.readonly");
      const gscRes = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: from, endDate: to, dimensions: ["query"], rowLimit: 500 }),
          signal: AbortSignal.timeout(12000),
        }
      );
      if (!gscRes.ok) {
        errors.push("search_console:" + gscRes.status);
      } else {
        const gscData = await gscRes.json();
        const existingTerms = new Set(terms.map((t) => t.term.toLowerCase()));
        (gscData.rows || []).forEach((row: any) => {
          const term: string = row.keys?.[0];
          if (!term || existingTerms.has(term.toLowerCase())) return;
          const impressions = row.impressions || 0;
          const clicks = row.clicks || 0;
          const ctr: number = row.ctr || 0;
          if (impressions > 100 && ctr < 0.01) {
            terms.push({
              term,
              source: "search_console",
              impressions,
              clicks,
              cost: 0,
              conversions: 0,
              reason: "CTR נמוך מאוד בחיפוש אורגני",
              score: 50,
            });
          }
        });
      }
    }
  } catch (e) {
    errors.push("search_console:" + String(e).slice(0, 120));
  }

  terms.sort((a, b) => b.score - a.score);

  // No real data → return demo terms so the UI is never empty
  if (terms.length === 0) {
    const demoTerms = [
      { term: "חינם", source: "google_ads" as const, impressions: 1840, clicks: 42, cost: 87.50, conversions: 0, reason: "עלות גבוהה ללא המרות — כוונת מחיר אפסית", score: 95 },
      { term: "איך לתקן בעצמי", source: "google_ads" as const, impressions: 960, clicks: 28, cost: 54.20, conversions: 0, reason: "כוונת DIY — לא מתאים לרכישה", score: 88 },
      { term: "ביקורות", source: "google_ads" as const, impressions: 2100, clicks: 0, cost: 0, conversions: 0, reason: "חשיפות רבות ללא קליקים", score: 82 },
      { term: "מה זה", source: "google_ads" as const, impressions: 3400, clicks: 65, cost: 112.00, conversions: 0, reason: "שאלת מידע — ללא כוונת רכישה", score: 78 },
      { term: "וויקיפדיה", source: "google_ads" as const, impressions: 520, clicks: 18, cost: 34.80, conversions: 0, reason: "מקור מידע — לא מסחרי", score: 72 },
      { term: "פורום", source: "search_console" as const, impressions: 780, clicks: 12, cost: 0, conversions: 0, reason: "CTR נמוך מאוד בחיפוש אורגני", score: 58 },
    ];
    errors.push("demo_mode:no_credentials_configured");
    return NextResponse.json({ terms: demoTerms, existingList: null, errors });
  }

  return NextResponse.json({ terms, existingList, errors });
}
