// ============================================================
// Meta Ads Sync Service
// Fetches campaigns + metrics via Graph API v19.0
// ============================================================

import { db } from "../../db/client.js";
import { logger } from "../../utils/logger.js";

const API_BASE = "https://graph.facebook.com/v19.0";

interface MetaCreds {
  accessToken: string;
  accountId: string; // act_XXXXXXXX
}

export class MetaAdsSyncService {
  private creds: MetaCreds;

  constructor(creds: MetaCreds) {
    this.creds = creds;
  }

  private async fetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams({ access_token: this.creds.accessToken, ...params });
    const url = `${API_BASE}${path}?${qs}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta API error ${res.status}: ${err}`);
    }
    return res.json();
  }

  async syncCampaigns(adAccountId: string): Promise<number> {
    const data = await this.fetch<{ data: any[] }>(
      `/${this.creds.accountId}/campaigns`,
      {
        fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
        limit: "200",
      }
    );

    let count = 0;
    for (const c of data.data) {
      await db.campaign.upsert({
        where: { adAccountId_externalId: { adAccountId, externalId: String(c.id) } },
        create: {
          adAccountId,
          externalId: String(c.id),
          name: c.name,
          status: this.mapStatus(c.status),
          type: c.objective,
          budgetAmountMicros: c.daily_budget ? BigInt(Number(c.daily_budget) * 10000) : null,
        },
        update: {
          name: c.name,
          status: this.mapStatus(c.status),
        },
      });
      count++;
    }
    return count;
  }

  async syncDailyMetrics(adAccountId: string, dateFrom: string, dateTo: string): Promise<number> {
    const data = await this.fetch<{ data: any[] }>(
      `/${this.creds.accountId}/insights`,
      {
        fields: "campaign_id,campaign_name,impressions,clicks,spend,actions,action_values",
        level: "campaign",
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        time_increment: "1",
        limit: "500",
      }
    );

    let count = 0;
    for (const r of data.data) {
      const campaign = await db.campaign.findFirst({
        where: { adAccountId, externalId: r.campaign_id },
      });
      if (!campaign) continue;

      const date = new Date(r.date_start);
      const conversions = this.extractActions(r.actions, "purchase");
      const conversionValue = this.extractActionValues(r.action_values, "purchase");

      await db.dailyMetric.upsert({
        where: { campaignId_date: { campaignId: campaign.id, date } },
        create: {
          campaignId: campaign.id,
          date,
          impressions: Number(r.impressions || 0),
          clicks: Number(r.clicks || 0),
          costMicros: BigInt(Math.round(Number(r.spend || 0) * 1_000_000)),
          conversions,
          conversionValue,
          ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
          cpc: r.clicks > 0 ? Number(r.spend || 0) / r.clicks : 0,
        },
        update: {
          impressions: Number(r.impressions || 0),
          clicks: Number(r.clicks || 0),
          costMicros: BigInt(Math.round(Number(r.spend || 0) * 1_000_000)),
          conversions,
          conversionValue,
        },
      });
      count++;
    }
    return count;
  }

  private extractActions(actions: any[], type: string): number {
    if (!Array.isArray(actions)) return 0;
    return actions
      .filter((a) => a.action_type === type || a.action_type === `offsite_conversion.fb_pixel_${type}`)
      .reduce((sum, a) => sum + Number(a.value || 0), 0);
  }

  private extractActionValues(actionValues: any[], type: string): number {
    if (!Array.isArray(actionValues)) return 0;
    return actionValues
      .filter((a) => a.action_type === type || a.action_type === `offsite_conversion.fb_pixel_${type}`)
      .reduce((sum, a) => sum + Number(a.value || 0), 0);
  }

  private mapStatus(status: string): "ACTIVE" | "PAUSED" | "REMOVED" | "ENDED" {
    const map: Record<string, "ACTIVE" | "PAUSED" | "REMOVED" | "ENDED"> = {
      ACTIVE: "ACTIVE",
      PAUSED: "PAUSED",
      DELETED: "REMOVED",
      ARCHIVED: "ENDED",
    };
    return map[status] || "ACTIVE";
  }
}
