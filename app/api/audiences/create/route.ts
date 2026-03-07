import { NextRequest, NextResponse } from "next/server";

// Create Meta Custom Audience
// Supports: website_traffic, lookalike
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, name, retentionDays = 30, sourceAudienceId, ratio = 0.01, country = "IL" } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!["website", "lookalike", "engagement"].includes(type)) {
    return NextResponse.json({ error: "type must be: website | lookalike | engagement" }, { status: 400 });
  }

  const metaToken = process.env.META_ACCESS_TOKEN;
  const metaAccountId = process.env.META_AD_ACCOUNT_ID;
  const pixelId = process.env.META_PIXEL_ID;

  if (!metaToken || !metaAccountId) {
    return NextResponse.json({ error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID" }, { status: 500 });
  }

  const errors: string[] = [];

  if (type === "website") {
    if (!pixelId) {
      return NextResponse.json({ error: "Missing META_PIXEL_ID for website audience" }, { status: 500 });
    }

    const retentionSeconds = retentionDays * 86400;
    const rule = {
      inclusions: {
        operator: "or",
        rules: [
          {
            event_sources: [{ id: pixelId, type: "pixel" }],
            retention_seconds: retentionSeconds,
            filter: {
              operator: "and",
              filters: [{ field: "event", operator: "eq", value: "PageView" }],
            },
          },
        ],
      },
    };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/act_${metaAccountId}/customaudiences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            subtype: "WEBSITE",
            retention_days: retentionDays,
            rule: JSON.stringify(rule),
            access_token: metaToken,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message, errors: [data.error.message] }, { status: 400 });
      }
      return NextResponse.json({ success: true, id: data.id, name, type: "website", platform: "meta" });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  if (type === "lookalike") {
    if (!sourceAudienceId) {
      return NextResponse.json({ error: "sourceAudienceId required for lookalike" }, { status: 400 });
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/act_${metaAccountId}/customaudiences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            subtype: "LOOKALIKE",
            origin_audience_id: sourceAudienceId,
            lookalike_spec: JSON.stringify({
              type: "SIMILARITY",
              ratio,
              country,
            }),
            access_token: metaToken,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, id: data.id, name, type: "lookalike", platform: "meta" });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  if (type === "engagement") {
    // Engagement audience: people who engaged with your Facebook page or Instagram
    try {
      const rule = {
        inclusions: {
          operator: "or",
          rules: [
            {
              event_sources: [{ id: metaAccountId, type: "ad_account" }],
              retention_seconds: retentionDays * 86400,
              filter: {
                operator: "and",
                filters: [{ field: "event", operator: "eq", value: "lead" }],
              },
            },
          ],
        },
      };

      const res = await fetch(
        `https://graph.facebook.com/v19.0/act_${metaAccountId}/customaudiences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            subtype: "ENGAGEMENT",
            retention_days: retentionDays,
            rule: JSON.stringify(rule),
            access_token: metaToken,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, id: data.id, name, type: "engagement", platform: "meta" });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "unknown type" }, { status: 400 });
}
