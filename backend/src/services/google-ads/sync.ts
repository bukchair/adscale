/**
 * Google Ads Sync Service
 * Ingests campaigns, ad groups, search terms, and daily metrics.
 * Handles rate limiting with exponential backoff.
 */
import { GoogleAdsApi } from "google-ads-api";
import { prisma } from "../../db/client.js";
import { logger } from "../../logger/index.js";
import type { AdAccount } from "@prisma/client";

const RETRY_BASE_MS = 1_000;
const MAX_RETRIES   = 5;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isRateLimit =
        err?.message?.includes("RATE_EXCEEDED") ||
        err?.message?.includes("RESOURCE_EXHAUSTED") ||
        err?.status === 429;

      if (attempt >= retries || !isRateLimit) throw err;

      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      logger.warn({ attempt, delay, err: err.message }, "Rate limited — retrying");
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function buildClient(account: AdAccount) {
  return new GoogleAdsApi({
    client_id:       process.env.GOOGLE_CLIENT_ID!,
    client_secret:   process.env.GOOGLE_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_DEVELOPER_TOKEN!,
  }).Customer({
    customer_id:   account.externalId,
    refresh_token: account.refreshToken ?? "",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncCampaigns(account: AdAccount): Promise<number> {
  const client = buildClient(account);

  const rows = await withRetry(() =>
    client.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.budget_amount_micros,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `)
  );

  let upserted = 0;
  for (const row of rows) {
    const c = row.campaign!;
    await prisma.campaign.upsert({
      where:  { adAccountId_externalId: { adAccountId: account.id, externalId: String(c.id) } },
      create: {
        adAccountId:  account.id,
        externalId:   String(c.id),
        name:         c.name ?? "",
        status:       mapCampaignStatus(c.status),
        type:         mapCampaignType(c.advertising_channel_type),
        budgetAmount: (c.budget_amount_micros ?? 0) / 1_000_000,
        startDate:    c.start_date ? new Date(c.start_date) : null,
        endDate:      c.end_date   ? new Date(c.end_date)   : null,
      },
      update: {
        name:         c.name ?? "",
        status:       mapCampaignStatus(c.status),
        budgetAmount: (c.budget_amount_micros ?? 0) / 1_000_000,
      },
    });
    upserted++;
  }
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH TERMS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncSearchTerms(
  account: AdAccount,
  dateFrom: string,   // YYYY-MM-DD
  dateTo:   string
): Promise<number> {
  const client = buildClient(account);

  const rows = await withRetry(() =>
    client.query(`
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        campaign.id,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc
      FROM search_term_view
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND metrics.impressions > 0
    `)
  );

  let upserted = 0;
  for (const row of rows) {
    const st      = row.search_term_view!;
    const metrics = row.metrics!;
    const campaignExternalId = String(row.campaign?.id ?? "");

    const campaign = await prisma.campaign.findFirst({
      where: { adAccountId: account.id, externalId: campaignExternalId },
    });
    if (!campaign) continue;

    const cost = (metrics.cost_micros ?? 0) / 1_000_000;
    const clicks = Number(metrics.clicks ?? 0);
    const conversions = Number(metrics.conversions ?? 0);

    await prisma.searchTerm.upsert({
      where: {
        id: `${campaign.id}:${st.search_term}:${dateFrom}:${dateTo}`,
      },
      create: {
        campaignId:      campaign.id,
        query:           st.search_term ?? "",
        impressions:     Number(metrics.impressions ?? 0),
        clicks,
        cost,
        conversions,
        conversionValue: Number(metrics.conversions_value ?? 0),
        ctr:             Number(metrics.ctr ?? 0),
        cpc:             clicks > 0 ? cost / clicks : null,
        cpa:             conversions > 0 ? cost / conversions : null,
        dateFrom:        new Date(dateFrom),
        dateTo:          new Date(dateTo),
      },
      update: {
        impressions:     Number(metrics.impressions ?? 0),
        clicks,
        cost,
        conversions,
        conversionValue: Number(metrics.conversions_value ?? 0),
        ctr:             Number(metrics.ctr ?? 0),
      },
    });
    upserted++;
  }
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY METRICS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncDailyMetrics(
  account: AdAccount,
  dateFrom: string,
  dateTo:   string
): Promise<number> {
  const client = buildClient(account);

  const rows = await withRetry(() =>
    client.query(`
      SELECT
        campaign.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND campaign.status != 'REMOVED'
    `)
  );

  let upserted = 0;
  for (const row of rows) {
    const m = row.metrics!;
    const date = new Date(row.segments?.date ?? dateFrom);
    const campaignExternalId = String(row.campaign?.id ?? "");

    const campaign = await prisma.campaign.findFirst({
      where: { adAccountId: account.id, externalId: campaignExternalId },
    });
    if (!campaign) continue;

    const cost = (m.cost_micros ?? 0) / 1_000_000;
    const conversions = Number(m.conversions ?? 0);
    const revenue = Number(m.conversions_value ?? 0);

    await prisma.dailyMetric.upsert({
      where:  { campaignId_date: { campaignId: campaign.id, date } },
      create: {
        campaignId:  campaign.id,
        adAccountId: account.id,
        date,
        impressions: Number(m.impressions ?? 0),
        clicks:      Number(m.clicks ?? 0),
        cost,
        conversions,
        conversionValue: revenue,
        revenue,
        ctr:         Number(m.ctr ?? 0),
        cpc:         (m.average_cpc ?? 0) / 1_000_000,
        cpa:         conversions > 0 ? cost / conversions : null,
        roas:        cost > 0 ? revenue / cost : null,
      },
      update: {
        impressions: Number(m.impressions ?? 0),
        clicks:      Number(m.clicks ?? 0),
        cost,
        conversions,
        conversionValue: revenue,
        revenue,
        roas: cost > 0 ? revenue / cost : null,
      },
    });
    upserted++;
  }
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function mapCampaignStatus(s: any): "ACTIVE" | "PAUSED" | "REMOVED" | "DRAFT" {
  const map: Record<string, "ACTIVE" | "PAUSED" | "REMOVED" | "DRAFT"> = {
    ENABLED: "ACTIVE", PAUSED: "PAUSED", REMOVED: "REMOVED",
  };
  return map[String(s)] ?? "PAUSED";
}

function mapCampaignType(t: any): "SEARCH" | "DISPLAY" | "SHOPPING" | "VIDEO" | "PMAX" {
  const map: Record<string, any> = {
    SEARCH: "SEARCH", DISPLAY: "DISPLAY", SHOPPING: "SHOPPING",
    VIDEO: "VIDEO", PERFORMANCE_MAX: "PMAX",
  };
  return map[String(t)] ?? "SEARCH";
}
