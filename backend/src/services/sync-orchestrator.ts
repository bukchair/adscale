/**
 * Sync Orchestrator
 * Coordinates all ingestion pipelines for a given organisation.
 *
 * Two modes:
 *   runFullSync       – backfills everything for a date range
 *   runIncrementalSync – fast delta from lastSyncAt (or N days ago)
 */
import { prisma } from "../db/client.js";
import { logger } from "../logger/index.js";

// Google Ads
import {
  syncCampaigns,
  syncAdGroups,
  syncKeywords,
  syncSearchTerms,
  syncDailyMetrics,
} from "./google-ads/sync.js";

// Meta Ads
import { syncMetaCampaigns, syncMetaDailyMetrics } from "./meta-ads/sync.js";

// WooCommerce
import { syncProducts, syncOrders, syncRefunds } from "./woocommerce/sync.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncSummary {
  orgId:     string;
  mode:      "full" | "incremental";
  dateFrom:  string;
  dateTo:    string;
  results:   Record<string, number>;  // key → records upserted
  errors:    Record<string, string>;  // key → error message
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full sync
// ─────────────────────────────────────────────────────────────────────────────

export async function runFullSync(
  orgId:    string,
  dateFrom: string,
  dateTo:   string
): Promise<SyncSummary> {
  const t0      = Date.now();
  const results: Record<string, number> = {};
  const errors:  Record<string, string> = {};

  logger.info({ orgId, dateFrom, dateTo }, "Full sync started");

  // ── Ad Accounts ───────────────────────────────────────────────────────────
  const adAccounts = await prisma.adAccount.findMany({
    where: { orgId, isActive: true },
  });

  for (const account of adAccounts) {
    const tag = `${account.platform.toLowerCase()}:${account.externalId}`;

    try {
      if (account.platform === "GOOGLE") {
        results[`${tag}:campaigns`]    = await syncCampaigns(account);
        results[`${tag}:adGroups`]     = await syncAdGroups(account);
        results[`${tag}:keywords`]     = await syncKeywords(account);
        results[`${tag}:dailyMetrics`] = await syncDailyMetrics(account, dateFrom, dateTo);
        results[`${tag}:searchTerms`]  = await syncSearchTerms(account, dateFrom, dateTo);
      } else if (account.platform === "META") {
        results[`${tag}:campaigns`]    = await syncMetaCampaigns(account);
        results[`${tag}:dailyMetrics`] = await syncMetaDailyMetrics(account, dateFrom, dateTo);
      }

      await prisma.adAccount.update({
        where: { id: account.id },
        data:  { lastSyncAt: new Date() },
      });
    } catch (err: any) {
      errors[tag] = err.message;
      logger.error({ tag, err: err.message }, "Ad account sync failed");
    }
  }

  // ── Stores ────────────────────────────────────────────────────────────────
  const stores = await prisma.storeIntegration.findMany({
    where: { orgId, isActive: true },
  });

  for (const store of stores) {
    const tag = `woo:${store.id}`;

    try {
      results[`${tag}:products`] = await syncProducts(store);
      results[`${tag}:orders`]   = await syncOrders(store, dateFrom);
      results[`${tag}:refunds`]  = await syncRefunds(store, dateFrom);

      await prisma.storeIntegration.update({
        where: { id: store.id },
        data:  { lastSyncAt: new Date() },
      });
    } catch (err: any) {
      errors[tag] = err.message;
      logger.error({ tag, err: err.message }, "Store sync failed");
    }
  }

  const summary: SyncSummary = {
    orgId,
    mode: "full",
    dateFrom,
    dateTo,
    results,
    errors,
    durationMs: Date.now() - t0,
  };

  logger.info(summary, "Full sync completed");
  return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Incremental sync
// Only pulls data since lastSyncAt (or DEFAULT_LOOKBACK_DAYS if never synced).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LOOKBACK_DAYS = 3;

export async function runIncrementalSync(orgId: string): Promise<SyncSummary> {
  const todayStr = isoDate(new Date());
  const t0       = Date.now();
  const results: Record<string, number> = {};
  const errors:  Record<string, string> = {};

  const adAccounts = await prisma.adAccount.findMany({
    where: { orgId, isActive: true },
  });

  for (const account of adAccounts) {
    const tag      = `${account.platform.toLowerCase()}:${account.externalId}`;
    const dateFrom = account.lastSyncAt
      ? isoDate(account.lastSyncAt)
      : isoDate(daysAgo(DEFAULT_LOOKBACK_DAYS));

    try {
      if (account.platform === "GOOGLE") {
        // Always refresh campaign/ad-group/keyword structure
        results[`${tag}:campaigns`]    = await syncCampaigns(account);
        results[`${tag}:adGroups`]     = await syncAdGroups(account);
        results[`${tag}:keywords`]     = await syncKeywords(account);
        // Delta metrics
        results[`${tag}:dailyMetrics`] = await syncDailyMetrics(account, dateFrom, todayStr);
        results[`${tag}:searchTerms`]  = await syncSearchTerms(account, dateFrom, todayStr);
      } else if (account.platform === "META") {
        results[`${tag}:campaigns`]    = await syncMetaCampaigns(account);
        results[`${tag}:dailyMetrics`] = await syncMetaDailyMetrics(account, dateFrom, todayStr);
      }

      await prisma.adAccount.update({
        where: { id: account.id },
        data:  { lastSyncAt: new Date() },
      });
    } catch (err: any) {
      errors[tag] = err.message;
      logger.error({ tag, err: err.message }, "Incremental ad account sync failed");
    }
  }

  const stores = await prisma.storeIntegration.findMany({
    where: { orgId, isActive: true },
  });

  for (const store of stores) {
    const tag      = `woo:${store.id}`;
    const dateFrom = store.lastSyncAt
      ? store.lastSyncAt.toISOString()
      : daysAgo(DEFAULT_LOOKBACK_DAYS).toISOString();

    try {
      results[`${tag}:orders`]  = await syncOrders(store, dateFrom);
      results[`${tag}:refunds`] = await syncRefunds(store, dateFrom);

      await prisma.storeIntegration.update({
        where: { id: store.id },
        data:  { lastSyncAt: new Date() },
      });
    } catch (err: any) {
      errors[tag] = err.message;
      logger.error({ tag, err: err.message }, "Incremental store sync failed");
    }
  }

  const summary: SyncSummary = {
    orgId,
    mode: "incremental",
    dateFrom: isoDate(daysAgo(DEFAULT_LOOKBACK_DAYS)),
    dateTo:   todayStr,
    results,
    errors,
    durationMs: Date.now() - t0,
  };

  logger.info(summary, "Incremental sync completed");
  return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
