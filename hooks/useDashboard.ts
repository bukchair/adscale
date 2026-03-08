// src/hooks/useDashboard.ts
"use client";
import { useState, useEffect } from "react";
import { getConnections } from "@/app/lib/auth";

export type Platform = "google" | "meta" | "tiktok";
export type CampaignStatus = "active" | "paused" | "draft" | "removed";

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpa: number;
}

export interface Summary {
  totalSpent: number;
  totalRevenue: number;
  avgRoas: number;
  totalConversions: number;
}

export interface TimeSeriesPoint {
  date: string;
  day: string;
  spent: number;
  revenue: number;
  roas: number;
  clicks: number;
  conversions: number;
}

export interface PlatformSummary {
  platform: Platform;
  spent: number;
  revenue: number;
  roas: number;
  clicks: number;
  conversions: number;
  impressions: number;
}

export interface DashboardData {
  summary: Summary;
  timeSeries: TimeSeriesPoint[];
  byPlatform: PlatformSummary[];
  campaigns: Campaign[];
  isLive: boolean;
  lastUpdated: string | null;
  apiErrors: string[];
}

const DEMO_DATA: DashboardData = {
  summary: {
    totalSpent: 12450,
    totalRevenue: 48200,
    avgRoas: 3.87,
    totalConversions: 342,
  },
  timeSeries: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
    day: ["א", "ב", "ג", "ד", "ה", "ו", "ש"][i],
    spent: 1500 + Math.random() * 500,
    revenue: 5800 + Math.random() * 2000,
    roas: 3.5 + Math.random() * 1.5,
    clicks: 800 + Math.random() * 400,
    conversions: 40 + Math.random() * 20,
  })),
  byPlatform: [
    { platform: "google", spent: 6200, revenue: 24000, roas: 3.87, clicks: 4200, conversions: 180, impressions: 85000 },
    { platform: "meta", spent: 4100, revenue: 15800, roas: 3.85, clicks: 2800, conversions: 112, impressions: 62000 },
    { platform: "tiktok", spent: 2150, revenue: 8400, roas: 3.91, clicks: 1900, conversions: 50, impressions: 45000 },
  ],
  campaigns: [
    { id: "1", name: "קמפיין Google - חיפוש", platform: "google", status: "active", budget: 3000, spent: 2800, impressions: 45000, clicks: 2200, conversions: 95, revenue: 12500, roas: 4.46, ctr: 4.9, cpc: 1.27, cpa: 29.5 },
    { id: "2", name: "Meta - רימרקטינג", platform: "meta", status: "active", budget: 2000, spent: 1900, impressions: 32000, clicks: 1400, conversions: 68, revenue: 8200, roas: 4.32, ctr: 4.4, cpc: 1.36, cpa: 27.9 },
    { id: "3", name: "TikTok - וידאו", platform: "tiktok", status: "paused", budget: 1500, spent: 1200, impressions: 28000, clicks: 980, conversions: 32, revenue: 4800, roas: 4.0, ctr: 3.5, cpc: 1.22, cpa: 37.5 },
  ],
  isLive: false,
  lastUpdated: new Date().toISOString(),
  apiErrors: [],
};

export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function getDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
}

export function useDashboard(from: string, to?: string) {
  const [data, setData] = useState<DashboardData>(DEMO_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const conns = getConnections();
        const connHeader = JSON.stringify({
          woocommerce: conns.woocommerce?.fields ?? {},
          ga4:         conns.ga4?.fields ?? {},
          gsc:         conns.gsc?.fields ?? {},
        });
        const res = await fetch(`/api/dashboard?from=${from}&to=${to}`, {
          headers: { "x-connections": connHeader },
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        if (json && json.summary) {
          setData(json);
        }
      } catch (e) {
        setError(String(e));
        // Keep demo data on error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [from, to, tick]);

  const refetch = () => {
    setTick(t => t + 1);
  };

  return { data, loading, error, refetch };
}