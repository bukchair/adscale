// ============================================================
// Google Ads Sync Service
// Fetches campaigns, metrics, search terms via REST API v19
// ============================================================

import { db } from "../../db/client.js";
import { logger } from "../../utils/logger.js";
import type { AdAccount } from "@prisma/client";

const API_BASE = "https://googleads.googleapis.com/v19";
const RATE_LIMIT_DELAY = 1000; // ms between requests

interface GoogleAdsCreds {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  developerToken: string;
  managerId?: string;
}

export class GoogleAdsSyncService {
  private creds: GoogleAdsCreds;
  private accountId: string;
  private managerId?: string;
  private token?: string;
  private tokenExpiry?: Date;

  constructor(creds: GoogleAdsCreds, accountId: string) {
    this.creds = creds;
    this.accountId = accountId;
    this.managerId = creds.managerId;
  }

  // ── Auth ──────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.creds.clientId,
        client_secret: this.creds.clientSecret,
        refresh_token: this.creds.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();
    if (!data.access_token) throw new Error("Google token refresh failed: " + JSON.stringify(data));

    this.token = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
    return this.token!;
  }

  private async query(gaql: string): Promise<any[]> {
    const token = await this.getToken();
    const customerId = this.accountId.replace(/-/g, "");

    const res = await fetch(`${API_BASE}/customers/${customerId}/googleAds:searchStream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "developer-token": this.creds.developerToken,
        ...(this.managerId ? { "login-customer-id": this.managerId.replace(/-/g, "") } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: gaql }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Ads API error ${res.status}: ${err}`);
    }

    const lines = (await res.text()).split("\n").filter(Boolean);
    const results: any[] = [];
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        if (chunk.results) results.push(...chunk.results);
      } catch {
        // skip malformed lines
      }
    }
    return results;
  }

  // ── Campaigns ─────────────────────────────────────────────

  async syncCampaigns(adAccountId: string): Promise<number> {
    const gaql = `
      SELECT
        campaign.id, campaign.name, campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        campaign.target_roas.target_roas,
        campaign.target_cpa.target_cpa_micros,
        campaign.start_date, campaign.end_date
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;

    const results = await this.query(gaql);
    let count = 0;

    for (const r of results) {
      const c = r.campaign;
      await db.campaign.upsert({
        where: { adAccountId_externalId: { adAccountId, externalId: String(c.id) } },
        create: {
          adAccountId,
          externalId: String(c.id),
          name: c.name,
          status: this.mapStatus(c.status),
          type: c.advertisingChannelType,
          budgetAmountMicros: r.campaignBudget?.amountMicros ? BigInt(r.campaignBudget.amountMicros) : null,
          targetRoas: c.targetRoas?.targetRoas || null,
          targetCpa: c.targetCpa?.targetCpaMicros ? Number(c.targetCpa.targetCpaMicros) / 1_000_000 : null,
        },
        update: {
          name: c.name,
          status: this.mapStatus(c.status),
          budgetAmountMicros: r.campaignBudget?.amountMicros ? BigInt(r.campaignBudget.amountMicros) : null,
        },
      });
      count++;
    }

    logger.info({ count, adAccountId }, "Google Ads campaigns synced");
    return count;
  }

  // ── Daily Metrics ─────────────────────────────────────────

  async syncDailyMetrics(adAccountId: string, dateFrom: string, dateTo: string): Promise<number> {
    const gaql = `
      SELECT
        campaign.id, campaign.name,
        segments.date,
        metrics.impressions, metrics.clicks,
        metrics.cost_micros, metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND campaign.status != 'REMOVED'
    `;

    const results = await this.query(gaql);
    let count = 0;

    for (const r of results) {
      const campaign = await db.campaign.findFirst({
        where: { adAccountId, externalId: String(r.campaign.id) },
      });
      if (!campaign) continue;

      const date = new Date(r.segments.date);
      const m = r.metrics;

      await db.dailyMetric.upsert({
        where: { campaignId_date: { campaignId: campaign.id, date } },
        create: {
          campaignId: campaign.id,
          date,
          impressions: Number(m.impressions || 0),
          clicks: Number(m.clicks || 0),
          costMicros: BigInt(m.costMicros || 0),
          conversions: Number(m.conversions || 0),
          conversionValue: Number(m.conversionsValue || 0),
          ctr: m.impressions > 0 ? m.clicks / m.impressions : 0,
          cpc: m.clicks > 0 ? Number(m.costMicros || 0) / 1_000_000 / m.clicks : 0,
        },
        update: {
          impressions: Number(m.impressions || 0),
          clicks: Number(m.clicks || 0),
          costMicros: BigInt(m.costMicros || 0),
          conversions: Number(m.conversions || 0),
        },
      });
      count++;
    }

    return count;
  }

  // ── Search Terms ──────────────────────────────────────────

  async syncSearchTerms(adAccountId: string, dateFrom: string, dateTo: string): Promise<number> {
    const gaql = `
      SELECT
        campaign.id,
        ad_group.id,
        search_term_view.search_term,
        search_term_view.status,
        segments.date,
        metrics.impressions, metrics.clicks,
        metrics.cost_micros, metrics.conversions,
        metrics.conversions_value
      FROM search_term_view
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND metrics.impressions > 0
    `;

    const results = await this.query(gaql);
    let count = 0;

    for (const r of results) {
      const campaign = await db.campaign.findFirst({
        where: { adAccountId, externalId: String(r.campaign.id) },
      });
      if (!campaign) continue;

      const adGroup = await db.adGroup.findFirst({
        where: { campaignId: campaign.id, externalId: String(r.adGroup.id) },
      });

      const date = new Date(r.segments.date);
      const m = r.metrics;

      await db.searchTerm.upsert({
        where: { campaignId_query_date: { campaignId: campaign.id, query: r.searchTermView.searchTerm, date } },
        create: {
          campaignId: campaign.id,
          adGroupId: adGroup?.id,
          query: r.searchTermView.searchTerm,
          date,
          impressions: Number(m.impressions || 0),
          clicks: Number(m.clicks || 0),
          costMicros: BigInt(m.costMicros || 0),
          conversions: Number(m.conversions || 0),
          conversionValue: Number(m.conversionsValue || 0),
        },
        update: {
          impressions: Number(m.impressions || 0),
          clicks: Number(m.clicks || 0),
          costMicros: BigInt(m.costMicros || 0),
          conversions: Number(m.conversions || 0),
        },
      });
      count++;
    }

    return count;
  }

  private mapStatus(status: string): "ACTIVE" | "PAUSED" | "REMOVED" | "ENDED" {
    const map: Record<string, "ACTIVE" | "PAUSED" | "REMOVED" | "ENDED"> = {
      ENABLED: "ACTIVE",
      PAUSED: "PAUSED",
      REMOVED: "REMOVED",
    };
    return map[status] || "ACTIVE";
  }

  // Retry with exponential backoff
  static async withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        // Rate limit: back off longer
        const isRateLimit = err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("429");
        const delay = isRateLimit ? Math.pow(2, attempt + 2) * 1000 : Math.pow(2, attempt) * 1000;
        logger.warn({ attempt, delay, err: err.message }, "Google Ads API retry");
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  }
}
