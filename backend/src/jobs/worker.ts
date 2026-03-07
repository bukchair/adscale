// ============================================================
// Background Worker — processes all job queues
// Run: npm run worker
// ============================================================

import { Worker } from "bullmq";
import { getConfig } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { db } from "../db/client.js";
import { GoogleAdsSyncService } from "../integrations/google-ads/sync.js";
import { MetaAdsSyncService } from "../integrations/meta-ads/sync.js";
import { WooCommerceSyncService } from "../integrations/woocommerce/sync.js";
import { IntentClassifier } from "../engines/intent-classifier/index.js";
import { QueryScorer } from "../engines/query-scorer/index.js";
import { NegativeKeywordEngine } from "../engines/negative-keyword/index.js";
import { ProfitEngine } from "../engines/profit/index.js";
import { BudgetPacingEngine } from "../engines/budget-pacing/index.js";
import { OptimizationEngine } from "../engines/optimization/index.js";
import { ApprovalEngine } from "../engines/approval/index.js";
import { auditEngine } from "../engines/audit/index.js";
import type { SyncJobData, ClassifyJobData, OptimizeJobData } from "./queues.js";

const { REDIS_URL } = getConfig();
const connection = { url: REDIS_URL };

// ── Sync Worker ───────────────────────────────────────────

const syncWorker = new Worker<SyncJobData>(
  "sync",
  async (job) => {
    const { type, adAccountId, storeId, dateFrom, dateTo, orgId } = job.data;
    logger.info({ type, adAccountId, storeId }, `Processing sync job`);

    // Update sync job status in DB
    const syncJobRecord = await db.syncJob.create({
      data: { adAccountId, storeId, type: type.toUpperCase() as any, status: "RUNNING", startedAt: new Date() },
    });

    try {
      let recordsProcessed = 0;

      if (adAccountId) {
        const account = await db.adAccount.findUnique({ where: { id: adAccountId } });
        if (!account) throw new Error("Ad account not found");

        const creds = account.credentials as any;

        if (account.platform === "GOOGLE_ADS") {
          const svc = new GoogleAdsSyncService(creds, account.externalId);
          if (type === "campaigns") recordsProcessed = await svc.syncCampaigns(adAccountId);
          else if (type === "metrics") recordsProcessed = await svc.syncDailyMetrics(adAccountId, dateFrom!, dateTo!);
          else if (type === "search_terms") recordsProcessed = await svc.syncSearchTerms(adAccountId, dateFrom!, dateTo!);
        } else if (account.platform === "META_ADS") {
          const svc = new MetaAdsSyncService(creds);
          if (type === "campaigns") recordsProcessed = await svc.syncCampaigns(adAccountId);
          else if (type === "metrics") recordsProcessed = await svc.syncDailyMetrics(adAccountId, dateFrom!, dateTo!);
        }
      }

      if (storeId) {
        const store = await db.storeIntegration.findUnique({ where: { id: storeId } });
        if (!store) throw new Error("Store not found");
        const creds = store.credentials as any;

        if (store.platform === "WOOCOMMERCE") {
          const svc = new WooCommerceSyncService(creds);
          if (type === "products") recordsProcessed = await svc.syncProducts(storeId);
          else if (type === "orders") recordsProcessed = await svc.syncOrders(storeId, dateFrom!, dateTo!);
        }
      }

      await db.syncJob.update({
        where: { id: syncJobRecord.id },
        data: { status: "COMPLETED", completedAt: new Date(), recordsProcessed },
      });

      await auditEngine.log({ orgId, action: `SYNC_COMPLETED`, entityType: "SyncJob", entityId: syncJobRecord.id, metadata: { type, recordsProcessed } });

    } catch (err: any) {
      await db.syncJob.update({
        where: { id: syncJobRecord.id },
        data: { status: "FAILED", completedAt: new Date(), errorMessage: err.message },
      });
      await auditEngine.log({ orgId, action: "SYNC_FAILED", entityType: "SyncJob", entityId: syncJobRecord.id, metadata: { type, error: err.message } });
      throw err;
    }
  },
  { connection, concurrency: 3 }
);

// ── Classify Worker ───────────────────────────────────────

const classifyWorker = new Worker<ClassifyJobData>(
  "classify",
  async (job) => {
    const { orgId, campaignId, queryIds } = job.data;
    logger.info({ campaignId, count: queryIds.length }, "Classifying search terms");

    const terms = await db.searchTerm.findMany({
      where: { id: { in: queryIds } },
    });

    if (terms.length === 0) return;

    const classifier = new IntentClassifier();
    const scorer = new QueryScorer();
    const negEngine = new NegativeKeywordEngine();

    // Classify intents
    const { results: intents } = await classifier.classify(terms.map((t) => t.query));

    // Score queries
    const scores = scorer.score(
      terms.map((t, i) => ({
        query: t.query,
        impressions: t.impressions,
        clicks: t.clicks,
        costMicros: t.costMicros,
        conversions: t.conversions,
        conversionValue: t.conversionValue,
        intent: intents[i]?.intent,
        intentConfidence: intents[i]?.confidence,
      }))
    );

    // Update search terms with classifications
    for (let i = 0; i < terms.length; i++) {
      const intent = intents[i];
      const score = scores[i];

      await db.searchTerm.update({
        where: { id: terms[i].id },
        data: {
          intent: intent?.intent?.toUpperCase() as any,
          intentConfidence: intent?.confidence,
          intentReason: intent?.reason,
          score: score?.score,
          riskLevel: score?.riskLevel?.toUpperCase() as any,
          recommendedAction: score?.recommendedAction,
          classifiedAt: new Date(),
        },
      });
    }

    // Generate negative keyword suggestions for wasteful queries
    const wastefulTerms = terms.filter((_, i) => scores[i]?.riskLevel === "critical" || scores[i]?.riskLevel === "high");
    if (wastefulTerms.length > 0) {
      const suggestions = await negEngine.analyze(
        wastefulTerms.map((t) => ({
          query: t.query,
          spend: Number(t.costMicros) / 1_000_000,
          conversions: t.conversions,
          clicks: t.clicks,
        }))
      );

      for (const s of suggestions) {
        const term = wastefulTerms.find((t) => t.query === s.query);
        await db.negativeKeywordSuggestion.create({
          data: {
            searchTermId: term?.id,
            query: s.query,
            suggestedText: s.suggestedText,
            matchType: s.matchType,
            confidence: s.confidence,
            risk: s.risk.toUpperCase() as any,
            reason: s.reason,
            wasteEstimate: s.wasteEstimate,
          },
        });
      }
    }

    logger.info({ campaignId, classified: terms.length }, "Search term classification complete");
  },
  { connection, concurrency: 2 }
);

// ── Optimize Worker ───────────────────────────────────────

const optimizeWorker = new Worker<OptimizeJobData>(
  "optimize",
  async (job) => {
    const { orgId, campaignIds, mode } = job.data;
    logger.info({ orgId, mode }, "Running optimization engine");

    const engine = new OptimizationEngine(mode);

    const campaigns = await db.campaign.findMany({
      where: {
        ...(campaignIds ? { id: { in: campaignIds } } : {}),
        adAccount: { organization: { id: orgId } },
        status: "ACTIVE",
      },
      include: {
        dailyMetrics: { orderBy: { date: "desc" }, take: 30 },
        negativeKeywordSuggestions: { where: { status: "PENDING" }, take: 20 },
      } as any,
    });

    const contexts = campaigns.map((c: any) => ({
      campaignId: c.id,
      campaignName: c.name,
    }));

    const decisions = engine.generateDecisions(contexts);

    // Save decisions as optimization actions + create approval requests
    const approvalEngine = new ApprovalEngine();

    for (const d of decisions) {
      const action = await db.optimizationAction.create({
        data: {
          campaignId: d.campaignId,
          type: d.type,
          title: d.title,
          reason: d.reason,
          confidence: d.confidence,
          severity: d.severity.toUpperCase() as any,
          expectedImpact: d.expectedImpact,
          payload: d.payload,
          status: "PENDING",
        },
      });

      if (mode !== "DRY_RUN") {
        await approvalEngine.createApprovalRequest({
          optimizationActionId: action.id,
          severity: d.severity,
          orgId,
        });
      }
    }

    await auditEngine.log({
      orgId,
      action: "OPTIMIZATION_RUN_COMPLETED",
      metadata: { mode, decisionsGenerated: decisions.length },
    });

    logger.info({ orgId, decisionsGenerated: decisions.length }, "Optimization complete");
  },
  { connection, concurrency: 1 }
);

// ── Error handlers ────────────────────────────────────────

for (const worker of [syncWorker, classifyWorker, optimizeWorker]) {
  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, queue: job?.queueName, err }, "Job failed");
  });
  worker.on("completed", (job) => {
    logger.debug({ jobId: job?.id, queue: job?.queueName }, "Job completed");
  });
}

logger.info("🚀 Background workers started");
