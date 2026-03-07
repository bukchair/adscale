import { NextRequest, NextResponse } from "next/server";

async function getGoogleToken() {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const merchantId = process.env.GMC_MERCHANT_ID;
  if (!merchantId) return NextResponse.json({ error: "Missing GMC_MERCHANT_ID" }, { status: 500 });

  const errors: string[] = [];

  let accessToken: string;
  try {
    accessToken = await getGoogleToken();
  } catch (e) {
    return NextResponse.json({ error: "Auth failed", errors: [String(e)] }, { status: 500 });
  }

  // Product statuses
  let totalProducts = 0, approved = 0, disapproved = 0, warnings = 0;
  const disapprovedProducts: { id: string; title: string; reasons: string[] }[] = [];

  try {
    let pageToken: string | undefined;
    let fetched = 0;
    do {
      const url = `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/productstatuses?maxResults=250${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const statusRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(12000),
      });
      if (!statusRes.ok) {
        const err = await statusRes.text();
        errors.push(`productstatuses:${statusRes.status}:${err.slice(0, 200)}`);
        break;
      }
      const statusData = await statusRes.json();
      const resources: any[] = statusData.resources || [];
      fetched += resources.length;
      totalProducts += resources.length;

      resources.forEach((p: any) => {
        const dests: any[] = p.destinationStatuses || [];
        const itemIssues: any[] = p.itemLevelIssues || [];
        const hasDisapproved = dests.some((d) => d.disapprovedCountries?.length > 0);
        const hasWarning = itemIssues.some((iss) => iss.servability === "unaffected");

        if (hasDisapproved) {
          disapproved++;
          const reasons = itemIssues
            .filter((iss) => iss.servability !== "unaffected")
            .map((iss) => iss.description)
            .slice(0, 2);
          if (disapprovedProducts.length < 20) {
            disapprovedProducts.push({ id: p.productId, title: p.title || p.productId, reasons });
          }
        } else if (hasWarning) {
          warnings++;
          approved++;
        } else {
          approved++;
        }
      });

      pageToken = statusData.nextPageToken;
    } while (pageToken && fetched < 1000);
  } catch (e) {
    errors.push(`productstatuses:${String(e).slice(0, 150)}`);
  }

  // Performance report - top products
  const topProducts: {
    offerId: string;
    title: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
  }[] = [];

  try {
    const reportRes = await fetch(
      `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/reports/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `SELECT segments.offer_id, segments.title, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM MerchantPerformanceView WHERE segments.date BETWEEN '${from}' AND '${to}' ORDER BY metrics.impressions DESC LIMIT 20`,
        }),
        signal: AbortSignal.timeout(12000),
      }
    );
    if (reportRes.ok) {
      const reportData = await reportRes.json();
      (reportData.results || []).forEach((r: any) => {
        const impr = parseInt(r.metrics?.impressions || "0");
        const clicks = parseInt(r.metrics?.clicks || "0");
        topProducts.push({
          offerId: r.segments?.offerId || "",
          title: r.segments?.title || r.segments?.offerId || "",
          impressions: impr,
          clicks,
          conversions: parseFloat(r.metrics?.conversions || "0"),
          revenue: parseFloat(r.metrics?.conversionsValue || "0"),
          ctr: impr > 0 ? (clicks / impr) * 100 : 0,
        });
      });
    } else {
      const err = await reportRes.text();
      errors.push(`reports:${reportRes.status}:${err.slice(0, 200)}`);
    }
  } catch (e) {
    errors.push(`reports:${String(e).slice(0, 150)}`);
  }

  return NextResponse.json({
    summary: { totalProducts, approved, disapproved, warnings },
    disapprovedProducts,
    topProducts,
    errors,
  });
}
