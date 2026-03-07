import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsToken, MANAGER_ID } from "@/app/lib/google-ads";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { keywords, matchType = "BROAD" } = body as {
    keywords: string[];
    matchType?: "BROAD" | "PHRASE" | "EXACT";
  };

  if (!keywords?.length) {
    return NextResponse.json({ error: "No keywords provided" }, { status: 400 });
  }

  const LIST_NAME = "AdScale - מילות שליליות";

  let accessToken: string;
  try {
    accessToken = await getGoogleAdsToken();
  } catch (e) {
    return NextResponse.json({ error: "Google Ads auth failed", detail: String(e) }, { status: 500 });
  }

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
  const headers = {
    Authorization: "Bearer " + accessToken,
    "developer-token": devToken,
    "login-customer-id": MANAGER_ID,
    "Content-Type": "application/json",
  };

  // ── Step 1: Find or create the shared negative keyword list ───────────────
  let sharedSetId: string | null = null;

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
    const existing = (listData.results || []).find((r: any) => r.sharedSet?.name === LIST_NAME);
    if (existing) sharedSetId = String(existing.sharedSet.id);
  }

  if (!sharedSetId) {
    const createRes = await fetch(
      `https://googleads.googleapis.com/v19/customers/${customerId}/sharedSets:mutate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [{ create: { name: LIST_NAME, type: "NEGATIVE_KEYWORDS" } }],
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: "Failed to create list", detail: err.slice(0, 300) }, { status: 500 });
    }
    const createData = await createRes.json();
    const resourceName: string = createData.results?.[0]?.resourceName || "";
    sharedSetId = resourceName.split("/").pop() || null;
  }

  if (!sharedSetId) {
    return NextResponse.json({ error: "Could not resolve list ID" }, { status: 500 });
  }

  // ── Step 2: Add keywords to the list ──────────────────────────────────────
  const operations = keywords.map((kw) => ({
    create: {
      sharedSet: `customers/${customerId}/sharedSets/${sharedSetId}`,
      keyword: { text: kw, matchType },
    },
  }));

  const addRes = await fetch(
    `https://googleads.googleapis.com/v19/customers/${customerId}/sharedCriteria:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ operations }),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!addRes.ok) {
    const err = await addRes.text();
    return NextResponse.json({ error: "Failed to add keywords", detail: err.slice(0, 300) }, { status: 500 });
  }

  // ── Step 3: Attach list to all enabled campaigns that don't have it yet ───
  let attachedCount = 0;
  try {
    const campQuery = `SELECT campaign.id FROM campaign WHERE campaign.status = 'ENABLED'`;
    const campRes = await fetch(
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
      { method: "POST", headers, body: JSON.stringify({ query: campQuery }), signal: AbortSignal.timeout(8000) }
    );

    if (campRes.ok) {
      const campData = await campRes.json();
      const allCampaignIds: string[] = (campData.results || []).map((r: any) => String(r.campaign?.id)).filter(Boolean);

      const alreadyQuery = `
        SELECT campaign_shared_set.campaign
        FROM campaign_shared_set
        WHERE campaign_shared_set.shared_set = 'customers/${customerId}/sharedSets/${sharedSetId}'`;
      const alreadyRes = await fetch(
        `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
        { method: "POST", headers, body: JSON.stringify({ query: alreadyQuery }), signal: AbortSignal.timeout(8000) }
      );

      const linkedIds = new Set<string>();
      if (alreadyRes.ok) {
        const alreadyData = await alreadyRes.json();
        (alreadyData.results || []).forEach((r: any) => {
          const id = r.campaignSharedSet?.campaign?.split("/").pop();
          if (id) linkedIds.add(id);
        });
      }

      const toLink = allCampaignIds.filter((id) => !linkedIds.has(id));
      if (toLink.length > 0) {
        const linkOps = toLink.map((id) => ({
          create: {
            campaign: `customers/${customerId}/campaigns/${id}`,
            sharedSet: `customers/${customerId}/sharedSets/${sharedSetId}`,
          },
        }));
        const linkRes = await fetch(
          `https://googleads.googleapis.com/v19/customers/${customerId}/campaignSharedSets:mutate`,
          { method: "POST", headers, body: JSON.stringify({ operations: linkOps }), signal: AbortSignal.timeout(8000) }
        );
        if (linkRes.ok) attachedCount = toLink.length;
      }
    }
  } catch (_) {
    // Non-fatal — keywords were added, just couldn't auto-attach
  }

  return NextResponse.json({
    success: true,
    listId: sharedSetId,
    listName: LIST_NAME,
    added: keywords.length,
    campaignsLinked: attachedCount,
  });
}
