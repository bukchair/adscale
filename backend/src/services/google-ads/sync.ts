/**
 * Google Ads Sync Service
 * Ingests campaigns, ad groups, keywords, search terms, and daily metrics.
 * Uses shared retry util with exponential back-off for rate limits.
 */
import { GoogleAdsApi } from "google-ads-api";
import { prisma } from "../../db/client.js";
import { logger } from "../../logger/index.js";
import { withRetry } from "../../utils/retry.js";
import { safeDecrypt } from "../../utils/encryption.js";
import type { AdAccount } from "@prisma/client";

function buildClient(account: AdAccount) {
  return new GoogleAdsApi({
    client_id:       process.env.GOOGLE_CLIENT_ID!,
    client_secret:   process.env.GOOGLE_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_DEVELOPER_TOKEN!,
  }).Customer({
    customer_id:   account.externalId,
    refresh_token: safeDecrypt(account.refreshToken),
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
  logger.info({ adAccountId: account.id, upserted }, "Google campaigns synced");
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// AD GROUPS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncAdGroups(account: AdAccount): Promise<number> {
  const client = buildClient(account);

  const rows = await withRetry(() =>
    client.query(`
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.cpc_bid_micros,
        campaign.id
      FROM ad_group
      WHERE ad_group.status != 'REMOVED'
        AND campaign.status != 'REMOVED'
    `)
  );

  let upserted = 0;
  for (const row of rows) {
    const ag = row.ad_group!;
    const campaignExternalId = String(row.campaign?.id ?? "");

    const campaign = await prisma.campaign.findFirst({
      where: { adAccountId: account.id, externalId: campaignExternalId },
    });
    if (!campaign) continue;

    await prisma.adGroup.upsert({
      where:  { campaignId_externalId: { campaignId: campaign.id, externalId: String(ag.id) } },
      create: {
        campaignId: campaign.id,
        externalId: String(ag.id),
        name:       ag.name ?? "",
        status:     mapCampaignStatus(ag.status),
        bidAmount:  ag.cpc_bid_micros ? ag.cpc_bid_micros / 1_000_000 : null,
      },
      update: {
        name:      ag.name ?? "",
        status:    mapCampaignStatus(ag.status),
        bidAmount: ag.cpc_bid_micros ? ag.cpc_bid_micros / 1_000_000 : null,
      },
    });
    upserted++;
  }
  logger.info({ adAccountId: account.id, upserted }, "Google ad groups synced");
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYWORDS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncKeywords(account: AdAccount): Promise<number> {
  const client = buildClient(account);

  const rows = await withRetry(() =>
    client.query(`
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.cpc_bid_micros,
        ad_group_criterion.quality_info.quality_score,
        ad_group.id,
        campaign.id
      FROM ad_group_criterion
      WHERE ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.status != 'REMOVED'
        AND campaign.status != 'REMOVED'
    `)
  );

  let upserted = 0;
  for (const row of rows) {
    const kw                 = row.ad_group_criterion!;
    const adGroupExternalId  = String(row.ad_group?.id  ?? "");
    const campaignExternalId = String(row.campaign?.id  ?? "");

    const campaign = await prisma.campaign.findFirst({
      where: { adAccountId: account.id, externalId: campaignExternalId },
    });
    if (!campaign) continue;

    const adGroup = await prisma.adGroup.findFirst({
      where: { campaignId: campaign.id, externalId: adGroupExternalId },
    });
    if (!adGroup) continue;

    const kwId = `${adGroup.id}:${kw.criterion_id}`;
    await prisma.keyword.upsert({
      where:  { id: kwId },
      create: {
        id:           kwId,
        adGroupId:    adGroup.id,
        externalId:   String(kw.criterion_id),
        text:         kw.keyword?.text ?? "",
        matchType:    mapMatchType(kw.keyword?.match_type),
        status:       mapCampaignStatus(kw.status),
        bidAmount:    kw.cpc_bid_micros ? kw.cpc_bid_micros / 1_000_000 : null,
        qualityScore: kw.quality_info?.quality_score ?? null,
      },
      update: {
        status:       mapCampaignStatus(kw.status),
        bidAmount:    kw.cpc_bid_micros ? kw.cpc_bid_micros / 1_000_000 : null,
        qualityScore: kw.quality_info?.quality_score ?? null,
      },
    });
    upserted++;
  }
  logger.info({ adAccountId: account.id, upserted }, "Google keywords synced");
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH TERMS
// ─────────────────────────────────────────────────────────────────────────────

export async function syncSearchTerms(
  account: AdAccount,
  dateFrom: string,
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

    const cost        = (metrics.cost_micros ?? 0) / 1_000_000;
    const clicks      = Number(metrics.clicks ?? 0);
    const conversions = Number(metrics.conversions ?? 0);
    const stId        = `${campaign.id}:${st.search_term}:${dateFrom}:${dateTo}`;

    await prisma.searchTerm.upsert({
      where:  { id: stId },
      create: {
        id:              stId,
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
        cpc:             clicks > 0 ? cost / clicks : null,
        cpa:             conversions > 0 ? cost / conversions : null,
      },
    });
    upserted++;
  }
  logger.info({ adAccountId: account.id, upserted, dateFrom, dateTo }, "Google search terms synced");
  return upserted;
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY METRICS (campaign-level)
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
        metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND campaign.status != 'REMOVED'
    `)
  );

  let upserted = 0;
  for (const row of rows) {
    const m    = row.metrics!;
    const date = new Date(row.segments?.date ?? dateFrom);
    const campaignExternalId = String(row.campaign?.id ?? "");

    const campaign = await prisma.campaign.findFirst({
      where: { adAccountId: account.id, externalId: campaignExternalId },
    });
    if (!campaign) continue;

    const cost        = (m.cost_micros ?? 0) / 1_000_000;
    const conversions = Number(m.conversions ?? 0);
    const revenue     = Number(m.conversions_value ?? 0);

    await prisma.dailyMetric.upsert({
      where:  { campaignId_date: { campaignId: campaign.id, date } },
      create: {
        campaignId:      campaign.id,
        adAccountId:     account.id,
        date,
        impressions:     Number(m.impressions ?? 0),
        clicks:          Number(m.clicks ?? 0),
        cost,
        conversions,
        conversionValue: revenue,
        revenue,
        ctr:             Number(m.ctr ?? 0),
        cpc:             (m.average_cpc ?? 0) / 1_000_000,
        cpa:             conversions > 0 ? cost / conversions : null,
        roas:            cost > 0 ? revenue / cost : null,
      },
      update: {
        impressions:     Number(m.impressions ?? 0),
        clicks:          Number(m.clicks ?? 0),
        cost,
        conversions,
        conversionValue: revenue,
        revenue,
        roas:            cost > 0 ? revenue / cost : null,
      },
    });
    upserted++;
  }
  logger.info({ adAccountId: account.id, upserted, dateFrom, dateTo }, "Google daily metrics synced");
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

function mapMatchType(t: any): "EXACT" | "PHRASE" | "BROAD" {
  const map: Record<string, "EXACT" | "PHRASE" | "BROAD"> = {
    EXACT: "EXACT", PHRASE: "PHRASE", BROAD: "BROAD",
  };
  return map[String(t)] ?? "BROAD";
}
