/**
 * BullMQ Worker
 * Processes sync, engine, and action jobs.
 * Run as a separate process: tsx src/jobs/worker.ts
 */
import { Worker } from "bullmq";
import { config } from "../config/index.js";
import { logger } from "../logger/index.js";
import { prisma } from "../db/client.js";
import {
  dlQueue,
  type SyncJobPayload,
  type EngineJobPayload,
  type ActionJobPayload,
} from "./queues.js";

// ── Sync services ─────────────────────────────────────────────────────────────
import {
  syncCampaigns,
  syncAdGroups,
  syncKeywords,
  syncSearchTerms,
  syncDailyMetrics,
} from "../services/google-ads/sync.js";
import { syncMetaCampaigns, syncMetaDailyMetrics } from "../services/meta-ads/sync.js";
import { syncProducts, syncOrders, syncRefunds } from "../services/woocommerce/sync.js";
import { runFullSync, runIncrementalSync } from "../services/sync-orchestrator.js";

// ── Engine services ───────────────────────────────────────────────────────────
import { classifyIntents } from "../engines/intent-classifier.js";
import { generateRecommendations, persistRecommendations } from "../engines/recommendation-engine.js";

const connection = { url: config.REDIS_URL };

// ─────────────────────────────────────────────────────────────────────────────
// SYNC WORKER
// ─────────────────────────────────────────────────────────────────────────────

const syncWorker = new Worker<SyncJobPayload>(
  "sync",
  async (job) => {
    const { type, orgId, adAccountId, storeId, dateFrom, dateTo } = job.data;
    logger.info({ type, orgId, jobId: job.id }, "Sync job started");

    const syncJob = await prisma.syncJob.create({
      data: {
        type:        mapSyncType(type),
        status:      "RUNNING",
        startedAt:   new Date(),
        orgId,
        adAccountId: adAccountId ?? null,
        storeId:     storeId     ?? null,
      },
    });

    let records = 0;

    try {
      const from = dateFrom ?? daysAgo(30);
      const to   = dateTo   ?? today();

      // ── Orchestrated ──
      if (type === "full_sync") {
        const summary = await runFullSync(orgId, from, to);
        records = Object.values(summary.results).reduce((a, b) => a + b, 0);
      } else if (type === "incremental_sync") {
        const summary = await runIncrementalSync(orgId);
        records = Object.values(summary.results).reduce((a, b) => a + b, 0);

      // ── Google Ads ──
      } else if (type === "google_campaigns" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncCampaigns(account);
      } else if (type === "google_ad_groups" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncAdGroups(account);
      } else if (type === "google_keywords" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncKeywords(account);
      } else if (type === "google_search_terms" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncSearchTerms(account, from, to);
      } else if (type === "google_metrics" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncDailyMetrics(account, from, to);

      // ── Meta Ads ──
      } else if (type === "meta_campaigns" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncMetaCampaigns(account);
      } else if (type === "meta_metrics" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncMetaDailyMetrics(account, from, to);

      // ── WooCommerce ──
      } else if (type === "woo_products" && storeId) {
        const store = await prisma.storeIntegration.findUniqueOrThrow({ where: { id: storeId } });
        records = await syncProducts(store);
      } else if (type === "woo_orders" && storeId) {
        const store = await prisma.storeIntegration.findUniqueOrThrow({ where: { id: storeId } });
        records = await syncOrders(store, dateFrom);
      } else if (type === "woo_refunds" && storeId) {
        const store = await prisma.storeIntegration.findUniqueOrThrow({ where: { id: storeId } });
        records = await syncRefunds(store, dateFrom);
      }

      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data:  { status: "DONE", completedAt: new Date(), recordsOut: records },
      });

      logger.info({ type, orgId, records, jobId: job.id }, "Sync job completed");
    } catch (err: any) {
      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data:  { status: "FAILED", completedAt: new Date(), errorMsg: String(err.message) },
      });
      throw err; // BullMQ will retry per queue defaultJobOptions
    }
  },
  { connection, concurrency: 3, limiter: { max: 10, duration: 60_000 } }
);

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE WORKER
// ─────────────────────────────────────────────────────────────────────────────

const engineWorker = new Worker<EngineJobPayload>(
  "engines",
  async (job) => {
    const { type, orgId, dateFrom, dateTo } = job.data;
    logger.info({ type, orgId, jobId: job.id }, "Engine job started");

    const from = new Date(dateFrom);

    if (type === "classify_intents") {
      const terms = await prisma.searchTerm.findMany({
        where: {
          campaign:     { adAccount: { orgId } },
          classifiedAt: null,
          dateFrom:     { gte: from },
        },
        take:    1000,
        orderBy: { cost: "desc" },
      });

      if (terms.length > 0) {
        const results = await classifyIntents(terms.map((t) => t.query));
        for (const r of results) {
          const term = terms.find((t) => t.query === r.query);
          if (!term) continue;
          await prisma.searchTerm.update({
            where: { id: term.id },
            data: {
              intent:       r.intent.toUpperCase() as any,
              intentScore:  r.confidence,
              intentReason: r.reason,
              classifiedAt: new Date(),
            },
          });
        }
        logger.info({ classified: results.length }, "Intent classification done");
      }
    }

    if (type === "generate_recommendations") {
      const to = new Date(dateTo);
      const recs = await generateRecommendations(orgId, from, to);
      await persistRecommendations(recs);
      logger.info({ count: recs.length }, "Recommendations generated");
    }
  },
  { connection, concurrency: 2 }
);

// ─────────────────────────────────────────────────────────────────────────────
// ACTION WORKER
// ─────────────────────────────────────────────────────────────────────────────

const actionWorker = new Worker<ActionJobPayload>(
  "actions",
  async (job) => {
    const { type, recommendationId, payload } = job.data;
    logger.info({ type, recommendationId, jobId: job.id }, "Action job started");

    const action = await prisma.optimizationAction.create({
      data: {
        type:       type as any,
        mode:       "AUTOMATED",
        status:     "EXECUTING",
        payload:    payload as any,
        executedAt: new Date(),
      },
    });

    try {
      let result: Record<string, unknown> = {};

      if (type === "BUDGET_CHANGE")   result = await executeBudgetChange(payload);
      if (type === "STATUS_CHANGE")   result = await executeStatusChange(payload);
      if (type === "NEGATIVE_KW_ADD") result = await executeNegativeKwAdd(payload);

      await prisma.optimizationAction.update({
        where: { id: action.id },
        data:  { status: "DONE", result: result as any },
      });

      await prisma.aiRecommendation.update({
        where: { id: recommendationId },
        data:  { status: "EXECUTED", executedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          action:   `action.${type.toLowerCase()}`,
          entity:   "OptimizationAction",
          entityId: action.id,
          after:    result as any,
          actionId: action.id,
        },
      });
    } catch (err: any) {
      await prisma.optimizationAction.update({
        where: { id: action.id },
        data:  { status: "FAILED", errorMsg: String(err.message) },
      });
      throw err;
    }
  },
  { connection, concurrency: 1 }  // serialize actions for safety
);

// ─────────────────────────────────────────────────────────────────────────────
// Dead-letter queue — park permanently-failed jobs for manual review
// ─────────────────────────────────────────────────────────────────────────────

for (const worker of [syncWorker, engineWorker, actionWorker]) {
  worker.on("failed", async (job, err) => {
    logger.error({ jobId: job?.id, queue: worker.name, err: err.message }, "Job failed");

    // If exhausted all retries, park in DLQ
    if (job && (job.attemptsMade ?? 0) >= (job.opts?.attempts ?? 1)) {
      await dlQueue.add("failed", {
        originalQueue: worker.name,
        jobId:         job.id,
        jobName:       job.name,
        data:          job.data,
        error:         err.message,
        failedAt:      new Date().toISOString(),
      });
      logger.warn({ jobId: job.id }, "Job moved to dead-letter queue");
    }
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, queue: worker.name }, "Job completed");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Action executors (DRY RUN — real API calls implemented in action service)
// ─────────────────────────────────────────────────────────────────────────────

async function executeBudgetChange(payload: any) {
  logger.info({ payload }, "[DRY RUN] Budget change");
  return { applied: true, newBudget: payload.recommendedBudget };
}

async function executeStatusChange(payload: any) {
  logger.info({ payload }, "[DRY RUN] Status change");
  return { applied: true, newStatus: payload.status };
}

async function executeNegativeKwAdd(payload: any) {
  logger.info({ payload }, "[DRY RUN] Negative keyword add");
  return { applied: true, added: payload.keywords?.length ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────────────────────────────────────

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received — shutting down workers");
  await Promise.all([
    syncWorker.close(),
    engineWorker.close(),
    actionWorker.close(),
  ]);
  process.exit(0);
});

logger.info("AdScale workers running");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function mapSyncType(t: string): any {
  const m: Record<string, string> = {
    full_sync:           "GOOGLE_ADS_CAMPAIGNS",
    incremental_sync:    "GOOGLE_ADS_CAMPAIGNS",
    google_campaigns:    "GOOGLE_ADS_CAMPAIGNS",
    google_ad_groups:    "GOOGLE_ADS_CAMPAIGNS",
    google_keywords:     "GOOGLE_ADS_CAMPAIGNS",
    google_search_terms: "GOOGLE_ADS_SEARCH_TERMS",
    google_metrics:      "GOOGLE_ADS_CAMPAIGNS",
    meta_campaigns:      "META_CAMPAIGNS",
    meta_metrics:        "META_CAMPAIGNS",
    woo_products:        "WOOCOMMERCE_PRODUCTS",
    woo_orders:          "WOOCOMMERCE_ORDERS",
    woo_refunds:         "WOOCOMMERCE_ORDERS",
  };
  return m[t] ?? "GOOGLE_ADS_CAMPAIGNS";
}
