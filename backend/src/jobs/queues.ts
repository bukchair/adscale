// ============================================================
// BullMQ Queue Definitions
// ============================================================

import { Queue, Worker, QueueEvents } from "bullmq";
import { getConfig } from "../config/index.js";
import { logger } from "../utils/logger.js";

const { REDIS_URL } = getConfig();

const connection = { url: REDIS_URL };

// ── Queue Definitions ─────────────────────────────────────

export const syncQueue = new Queue("sync", { connection });
export const classifyQueue = new Queue("classify", { connection });
export const optimizeQueue = new Queue("optimize", { connection });
export const creativeQueue = new Queue("creative", { connection });
export const notifyQueue = new Queue("notify", { connection });

// ── Job Types ─────────────────────────────────────────────

export interface SyncJobData {
  type: "campaigns" | "metrics" | "search_terms" | "products" | "orders";
  adAccountId?: string;
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
  orgId: string;
}

export interface ClassifyJobData {
  orgId: string;
  campaignId: string;
  queryIds: string[]; // SearchTerm IDs to classify
}

export interface OptimizeJobData {
  orgId: string;
  campaignIds?: string[]; // null = all campaigns
  mode: "DRY_RUN" | "SUGGESTION" | "APPROVAL_REQUIRED" | "AUTOMATED";
}

export interface CreativeJobData {
  orgId: string;
  campaignId: string;
  adId?: string;
  variantCount?: number;
}

// ── Schedule helpers ──────────────────────────────────────

export async function scheduleDailySync(orgId: string, adAccountId: string) {
  // Sync metrics every 6 hours
  await syncQueue.add(
    "daily_metrics",
    { type: "metrics", adAccountId, orgId, dateFrom: yesterday(), dateTo: today() } as SyncJobData,
    { repeat: { pattern: "0 */6 * * *" }, jobId: `metrics_${adAccountId}` }
  );

  // Sync search terms every 12 hours
  await syncQueue.add(
    "search_terms",
    { type: "search_terms", adAccountId, orgId, dateFrom: yesterday(), dateTo: today() } as SyncJobData,
    { repeat: { pattern: "0 */12 * * *" }, jobId: `st_${adAccountId}` }
  );
}

export async function scheduleOptimizationRun(orgId: string, mode: OptimizeJobData["mode"] = "SUGGESTION") {
  await optimizeQueue.add(
    "full_optimization",
    { orgId, mode } as OptimizeJobData,
    { repeat: { pattern: "0 8 * * *" }, jobId: `optimize_${orgId}` } // Daily at 8am
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

logger.info("Job queues initialized");
