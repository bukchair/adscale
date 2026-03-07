/**
 * Meta Ads Sync Service
 * Ingests campaigns and daily insights from the Facebook Marketing API (v19).
 * No SDK — uses native fetch with cursor-based pagination.
 */
import { prisma } from "../../db/client.js";
import { logger } from "../../logger/index.js";
import { withRetry } from "../../utils/retry.js";
import { safeDecrypt } from "../../utils/encryption.js";
import type { AdAccount } from "@prisma/client";

const GRAPH_BASE    = "https://graph.facebook.com/v19.0";
const PAGE_LIMIT    = 100;
const CAMPAIGN_FIELDS = "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time";
const INSIGHT_FIELDS  = "campaign_id,impressions,clicks,spend,actions,action_values,ctr,cpc,reach,date_start";

// ─────────────────────────────────────────────────────────────────────────────
// HTTP layer
// ─────────────────────────────────────────────────────────────────────────────

async function metaGet(
  path: string,
  params: Record<string, string>,
  token: string
): Promise<any> {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  url.searchParams.set("access_token", token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  return withRetry(
    async () => {
      const res  = await fetch(url.toString());
      const body = await res.json() as any;

      if (!res.ok || body.error) {
        const msg        = body.error?.message ?? `Meta API ${res.status}`;
        const isRateLimit =
          body.error?.code === 17 ||
          body.error?.code === 32 ||
          body.error?.error_subcode === 2446079;
        const err: any = new Error(msg);
        err.status     = isRateLimit ? 429 : res.status;
        throw err;
      }
      return body;
    },
    { maxRetries: 6, baseDelayMs: 2_000 }
  );
}

async function* paginate(
  path: string,
  params: Record<string, string>,
  token: string
): AsyncGenerator<any> {
  let after: string | null = null;

  while (true) {
    const p = { ...params, limit: String(PAGE_LIMIT) };
    if (after) p.after = after;

    const body = await metaGet(path, p, token);
    const data: any[] = body.data ?? [];

    for (const item of data) yield item;

    after = body.paging?.cursors?.after ?? null;
    if (!after || data.length < PAGE_LIMIT) break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncMetaCampaigns(account: AdAccount): Promise<number> {
  const token = safeDecrypt(account.accessToken);
  let upserted = 0;

  for await (const c of paginate(
    `act_${account.externalId}/campaigns`,
    { fields: CAMPAIGN_FIELDS },
    token
  )) {
    const budgetCents  = parseInt(c.daily_budget ?? c.lifetime_budget ?? "0", 10);
    const budgetAmount = budgetCents / 100;   // Meta returns cents

    await prisma.campaign.upsert({
      where:  { adAccountId_externalId: { adAccountId: account.id, externalId: c.id } },
      create: {
        adAccountId:  account.id,
        externalId:   c.id,
        name:         c.name ?? "",
        status:       mapMetaStatus(c.status),
        type:         mapMetaObjective(c.objective),
        budgetAmount,
        startDate:    c.start_time ? new Date(c.start_time) : null,
        endDate:      c.stop_time  ? new Date(c.stop_time)  : null,
      },
      update: {
        name:         c.name ?? "",
        status:       mapMetaStatus(c.status),
        budgetAmount,
      },
    });
    upserted++;
  }

  logger.info({ adAccountId: account.id, upserted }, "Meta campaigns synced");
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY METRICS (Insights — campaign level)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncMetaDailyMetrics(
  account: AdAccount,
  dateFrom: string,   // YYYY-MM-DD
  dateTo:   string
): Promise<number> {
  const token = safeDecrypt(account.accessToken);
  let upserted = 0;

  for await (const row of paginate(
    `act_${account.externalId}/insights`,
    {
      fields:         INSIGHT_FIELDS,
      level:          "campaign",
      time_increment: "1",
      time_range:     JSON.stringify({ since: dateFrom, until: dateTo }),
    },
    token
  )) {
    const campaignExternalId = row.campaign_id ?? "";
    const campaign = await prisma.campaign.findFirst({
      where: { adAccountId: account.id, externalId: campaignExternalId },
    });
    if (!campaign) continue;

    const cost        = parseFloat(row.spend       ?? "0");
    const clicks      = parseInt(row.clicks        ?? "0", 10);
    const impressions = parseInt(row.impressions   ?? "0", 10);
    const conversions = extractAction(row.actions, "purchase");
    const revenue     = extractAction(row.action_values, "purchase");
    const date        = new Date(row.date_start);

    await prisma.dailyMetric.upsert({
      where:  { campaignId_date: { campaignId: campaign.id, date } },
      create: {
        campaignId:      campaign.id,
        adAccountId:     account.id,
        date,
        impressions,
        clicks,
        cost,
        conversions,
        conversionValue: revenue,
        revenue,
        ctr:             parseFloat(row.ctr ?? "0") / 100,
        cpc:             parseFloat(row.cpc ?? "0"),
        cpa:             conversions > 0 ? cost / conversions : null,
        roas:            cost > 0 ? revenue / cost : null,
      },
      update: {
        impressions,
        clicks,
        cost,
        conversions,
        conversionValue: revenue,
        revenue,
        roas:            cost > 0 ? revenue / cost : null,
      },
    });
    upserted++;
  }

  logger.info({ adAccountId: account.id, upserted, dateFrom, dateTo }, "Meta daily metrics synced");
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract a numeric value from Meta's actions/action_values arrays.
 * Handles pixel events like `offsite_conversion.fb_pixel_purchase`.
 */
function extractAction(arr: any[] | undefined, type: string): number {
  if (!arr) return 0;
  const found = arr.find(
    (a) =>
      a.action_type === type ||
      a.action_type === `offsite_conversion.fb_pixel_${type}`
  );
  return found ? parseFloat(found.value ?? "0") : 0;
}

function mapMetaStatus(s: string): "ACTIVE" | "PAUSED" | "REMOVED" | "DRAFT" {
  const map: Record<string, "ACTIVE" | "PAUSED" | "REMOVED" | "DRAFT"> = {
    ACTIVE: "ACTIVE", PAUSED: "PAUSED", DELETED: "REMOVED", ARCHIVED: "REMOVED",
  };
  return map[s] ?? "PAUSED";
}

function mapMetaObjective(o: string): "SEARCH" | "DISPLAY" | "SHOPPING" | "VIDEO" | "PMAX" {
  const map: Record<string, any> = {
    OUTCOME_SALES:           "SHOPPING",
    OUTCOME_LEADS:           "SEARCH",
    OUTCOME_TRAFFIC:         "DISPLAY",
    OUTCOME_ENGAGEMENT:      "DISPLAY",
    OUTCOME_AWARENESS:       "DISPLAY",
    OUTCOME_APP_PROMOTION:   "DISPLAY",
    VIDEO_VIEWS:             "VIDEO",
  };
  return map[o] ?? "DISPLAY";
}
