import { Queue } from "bullmq";
import { config } from "../config/index.js";

const connection = { url: config.REDIS_URL };

export const syncQueue   = new Queue("sync", {
  connection,
  defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
});
export const engineQueue = new Queue("engines", {
  connection,
  defaultJobOptions: { attempts: 2, backoff: { type: "exponential", delay: 10_000 } },
});
export const actionQueue = new Queue("actions", {
  connection,
  defaultJobOptions: { attempts: 2, backoff: { type: "exponential", delay: 5_000 } },
});
export const dlQueue = new Queue("dead-letter", { connection });

// ─────────────────────────────────────────────────────────────────────────────
// Typed payloads
// ─────────────────────────────────────────────────────────────────────────────

export type SyncJobType =
  | "full_sync"
  | "incremental_sync"
  | "google_campaigns"
  | "google_ad_groups"
  | "google_keywords"
  | "google_search_terms"
  | "google_metrics"
  | "meta_campaigns"
  | "meta_metrics"
  | "woo_products"
  | "woo_orders"
  | "woo_refunds";

export interface SyncJobPayload {
  type:         SyncJobType;
  orgId:        string;
  adAccountId?: string;
  storeId?:     string;
  dateFrom?:    string;
  dateTo?:      string;
}

export interface EngineJobPayload {
  type:     "classify_intents" | "score_queries" | "analyze_negatives" | "generate_recommendations";
  orgId:    string;
  dateFrom: string;
  dateTo:   string;
}

export interface ActionJobPayload {
  type:             string;
  recommendationId: string;
  orgId:            string;
  payload:          Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recurring schedules
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleRecurringJobs(orgId: string): Promise<void> {
  // Incremental sync every 6 hours
  await syncQueue.add(
    "incremental-sync",
    { type: "incremental_sync", orgId } satisfies SyncJobPayload,
    { repeat: { pattern: "0 */6 * * *" }, jobId: `incremental-sync:${orgId}` }
  );

  // Engine run every morning at 05:00
  await engineQueue.add(
    "daily-engines",
    {
      type:     "generate_recommendations",
      orgId,
      dateFrom: daysAgo(7),
      dateTo:   today(),
    } satisfies EngineJobPayload,
    { repeat: { pattern: "0 5 * * *" }, jobId: `daily-engines:${orgId}` }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
