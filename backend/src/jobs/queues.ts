import { Queue } from "bullmq";
import { config } from "../config/index.js";

const connection = { url: config.REDIS_URL };

export const syncQueue = new Queue("sync", { connection });
export const engineQueue = new Queue("engines", { connection });
export const actionQueue = new Queue("actions", { connection });

// Typed job payloads
export interface SyncJobPayload {
  type:        "google_campaigns" | "google_search_terms" | "google_metrics" | "woo_products" | "woo_orders";
  orgId:       string;
  adAccountId?: string;
  storeId?:    string;
  dateFrom?:   string;
  dateTo?:     string;
}

export interface EngineJobPayload {
  type:    "classify_intents" | "score_queries" | "analyze_negatives" | "generate_recommendations";
  orgId:   string;
  dateFrom: string;
  dateTo:   string;
}

export interface ActionJobPayload {
  type:           string;
  recommendationId: string;
  orgId:          string;
  payload:        Record<string, unknown>;
}

// Schedule recurring sync every 6 hours
export async function scheduleRecurringJobs(orgId: string) {
  await syncQueue.add(
    "daily-sync",
    { type: "google_campaigns", orgId } satisfies SyncJobPayload,
    { repeat: { pattern: "0 */6 * * *" } }
  );
  await engineQueue.add(
    "daily-engines",
    { type: "generate_recommendations", orgId, dateFrom: daysAgo(7), dateTo: today() } satisfies EngineJobPayload,
    { repeat: { pattern: "0 5 * * *" } }  // 5am daily
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
