/**
 * BullMQ Worker
 * Processes sync, engine, and action jobs.
 * Run as a separate process: tsx src/jobs/worker.ts
 */
import { Worker } from "bullmq";
import { config } from "../config/index.js";
import { logger } from "../logger/index.js";
import { prisma } from "../db/client.js";
import type { SyncJobPayload, EngineJobPayload, ActionJobPayload } from "./queues.js";

// Services
import { syncCampaigns, syncSearchTerms, syncDailyMetrics } from "../services/google-ads/sync.js";
import { syncProducts, syncOrders } from "../services/woocommerce/sync.js";

// Engines
import { classifyIntents } from "../engines/intent-classifier.js";
import { analyzeTerms } from "../engines/negative-keyword.js";
import { generateRecommendations, persistRecommendations } from "../engines/recommendation-engine.js";

const connection = { url: config.REDIS_URL };

// ─────────────────────────────────────────────────────────────────────────────
// SYNC WORKER
// ─────────────────────────────────────────────────────────────────────────────

const syncWorker = new Worker<SyncJobPayload>(
  "sync",
  async (job) => {
    const { type, orgId, adAccountId, storeId, dateFrom, dateTo } = job.data;
    logger.info({ type, orgId }, "Sync job started");

    const syncJob = await prisma.syncJob.create({
      data: {
        type:       mapSyncType(type),
        status:     "RUNNING",
        startedAt:  new Date(),
        orgId,
        adAccountId: adAccountId ?? null,
        storeId:     storeId ?? null,
      },
    });

    try {
      let records = 0;

      if (type === "google_campaigns" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        records = await syncCampaigns(account);
      }

      if (type === "google_search_terms" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        const from = dateFrom ?? daysAgo(30);
        const to   = dateTo   ?? today();
        records = await syncSearchTerms(account, from, to);
      }

      if (type === "google_metrics" && adAccountId) {
        const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: adAccountId } });
        const from = dateFrom ?? daysAgo(30);
        const to   = dateTo   ?? today();
        records = await syncDailyMetrics(account, from, to);
      }

      if (type === "woo_products" && storeId) {
        const store = await prisma.storeIntegration.findUniqueOrThrow({ where: { id: storeId } });
        records = await syncProducts(store);
      }

      if (type === "woo_orders" && storeId) {
        const store = await prisma.storeIntegration.findUniqueOrThrow({ where: { id: storeId } });
        records = await syncOrders(store, dateFrom);
      }

      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data:  { status: "DONE", completedAt: new Date(), recordsOut: records },
      });

      logger.info({ type, orgId, records }, "Sync job completed");
    } catch (err: any) {
      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data:  { status: "FAILED", completedAt: new Date(), errorMsg: String(err.message) },
      });
      throw err;
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
    logger.info({ type, orgId }, "Engine job started");

    const from = new Date(dateFrom);
    const to   = new Date(dateTo);

    if (type === "classify_intents") {
      // Load unclassified search terms
      const terms = await prisma.searchTerm.findMany({
        where: {
          campaign: { adAccount: { orgId } },
          classifiedAt: null,
          dateFrom:     { gte: from },
        },
        take: 1000,
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
    logger.info({ type, recommendationId }, "Action job started");

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

      // Execute the action (API calls to ad platforms)
      if (type === "BUDGET_CHANGE") {
        result = await executeBudgetChange(payload);
      }
      if (type === "STATUS_CHANGE") {
        result = await executeStatusChange(payload);
      }
      if (type === "NEGATIVE_KW_ADD") {
        result = await executeNegativeKwAdd(payload);
      }

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
// Action executors (stubs — implement with real API calls)
// ─────────────────────────────────────────────────────────────────────────────

async function executeBudgetChange(payload: any) {
  // TODO: call Google Ads / Meta API to update budget
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
// Error handlers
// ─────────────────────────────────────────────────────────────────────────────

for (const worker of [syncWorker, engineWorker, actionWorker]) {
  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Job failed");
  });
  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Job completed");
  });
}

process.on("SIGTERM", async () => {
  await Promise.all([syncWorker.close(), engineWorker.close(), actionWorker.close()]);
  process.exit(0);
});

logger.info("⚙️  AdScale workers running");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}
function mapSyncType(t: string): any {
  const m: Record<string, string> = {
    google_campaigns:    "GOOGLE_ADS_CAMPAIGNS",
    google_search_terms: "GOOGLE_ADS_SEARCH_TERMS",
    google_metrics:      "GOOGLE_ADS_CAMPAIGNS",
    woo_products:        "WOOCOMMERCE_PRODUCTS",
    woo_orders:          "WOOCOMMERCE_ORDERS",
  };
  return m[t] ?? "GOOGLE_ADS_CAMPAIGNS";
}
