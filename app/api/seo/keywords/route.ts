import { NextRequest, NextResponse } from "next/server";

async function getServiceAccountToken() {
  const clientEmail  = process.env.GA4_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GA4_PRIVATE_KEY;
  if (!clientEmail || !privateKeyRaw) throw new Error("Missing GA4 service account env vars");
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600, iat: now,
  })).toString("base64url");
  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(privateKey, "base64url");
  const jwt = `${header}.${payload}.${sig}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await tokenRes.json();
  if (!data.access_token) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token as string;
}

export async function GET(req: NextRequest) {
  const connectionsHeader = req.headers.get("x-connections");
  let gscFields: Record<string, string> = {};
  try {
    const all = JSON.parse(connectionsHeader || "{}");
    gscFields = all.gsc || {};
  } catch {}

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to   = searchParams.get("to")   || new Date().toISOString().split("T")[0];

  // Try to get siteUrl from connection first, then env
  const siteUrl = gscFields.site_url || process.env.GSC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json({ keywords: DEMO_KEYWORDS, isDemo: true });
  }

  try {
    const accessToken = await getServiceAccountToken();
    const body = {
      startDate: from, endDate: to,
      dimensions: ["query", "page"],
      rowLimit: 100,
      dataState: "all",
    };
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GSC ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();

    const keywords = (data.rows || [])
      .filter((r: any) => r.position && r.impressions)
      .map((r: any) => {
        const position = Math.round(r.position * 10) / 10;
        const ctr = r.ctr * 100;
        let opportunity: "page2" | "low_ctr" | "featured" | "new" = "new";
        if (position > 10 && position <= 20) opportunity = "page2";
        else if (position <= 10 && ctr < 3) opportunity = "low_ctr";
        else if (position <= 5 && ctr < 2) opportunity = "featured";
        return {
          keyword: r.keys[0],
          position,
          impressions: r.impressions,
          clicks: r.clicks,
          ctr: Math.round(ctr * 100) / 100,
          opportunity,
          page: r.keys[1] || "/",
          suggestedAction: position > 10
            ? "שפר כותרת H1 והוסף תוכן עשיר לדף"
            : ctr < 3
            ? "שנה meta description לכלול קריאה לפעולה"
            : "הוסף תמצית קצרה בראש הדף לזכייה ב-Featured Snippet",
          suggestedActionEn: position > 10
            ? "Improve H1 title and add rich content to page"
            : ctr < 3
            ? "Update meta description to include a CTA"
            : "Add a concise summary at top of page to win Featured Snippet",
        };
      })
      .sort((a: any, b: any) => b.impressions - a.impressions)
      .slice(0, 30);

    return NextResponse.json({ keywords, isDemo: false });
  } catch {
    return NextResponse.json({ keywords: DEMO_KEYWORDS, isDemo: true });
  }
}

const DEMO_KEYWORDS = [
  { keyword: "נעלי ריצה מקצועיות", position: 11, impressions: 8400, clicks: 142, ctr: 1.69, opportunity: "page2", page: "/category/running-shoes", suggestedAction: "שפר כותרת H1 והוסף תוכן עשיר לדף", suggestedActionEn: "Improve H1 title and add rich content to page" },
  { keyword: "תיק גב לטיולים", position: 7, impressions: 5200, clicks: 88, ctr: 1.69, opportunity: "low_ctr", page: "/product/backpack", suggestedAction: "שנה meta description לכלול קריאה לפעולה", suggestedActionEn: "Update meta description to include a CTA" },
  { keyword: "שעון חכם זול", position: 4, impressions: 3100, clicks: 48, ctr: 1.55, opportunity: "low_ctr", page: "/category/electronics", suggestedAction: "שנה meta description לכלול מחיר ומבצע", suggestedActionEn: "Update meta description with price and offer" },
  { keyword: "גרביים לריצה", position: 14, impressions: 2800, clicks: 23, ctr: 0.82, opportunity: "page2", page: "/product/sport-socks", suggestedAction: "הוסף תוכן עשיר ומילות מפתח לדף", suggestedActionEn: "Add rich content and target keywords to page" },
  { keyword: "כיצד לבחור נעלי ריצה", position: 18, impressions: 4200, clicks: 19, ctr: 0.45, opportunity: "featured", page: "/blog/how-to-choose", suggestedAction: "הוסף תמצית קצרה בראש הדף לזכייה ב-Featured Snippet", suggestedActionEn: "Add concise answer at top of page to win Featured Snippet" },
  { keyword: "קפסולות קפה nespresso", position: 22, impressions: 3600, clicks: 12, ctr: 0.33, opportunity: "page2", page: "/product/coffee", suggestedAction: "צור עמוד נחיתה ייעודי עם תוכן עמוק", suggestedActionEn: "Create dedicated landing page with deep content" },
];
