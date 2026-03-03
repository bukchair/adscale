// src/hooks/useDashboard.ts
// Hook מרכזי לשליפת כל נתוני הדשבורד

import { useState, useEffect, useCallback } from "react";

// ── טיפוסים ─────────────────────────────────────────────────────
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

export interface TimeSeriesPoint {
  date: string;
  day: string;       // תווית קצרה לגרף
  spent: number;
  revenue: number;
  roas: number;
  clicks: number;
  conversions: number;
}

export interface PlatformSummary {
  spent: number;
  revenue: number;
  conversions: number;
  roas: number;
  activeCampaigns: number;
}

export interface DashboardData {
  campaigns: Campaign[];
  timeSeries: TimeSeriesPoint[];
  summary: {
    totalSpent: number;
    totalRevenue: number;
    totalConversions: number;
    avgRoas: number;
  };
  byPlatform: Record<Platform, PlatformSummary>;
  apiErrors: Record<string, string>;  // שגיאות חלקיות לפי פלטפורמה
  isLive: boolean;                    // true = נתונים אמיתיים, false = דמו
  lastUpdated: string | null;
}

export interface DateRange {
  from: string;
  to: string;
}

// ── נתוני ברירת מחדל (דמו) ──────────────────────────────────────
const DEMO_DATA: DashboardData = {
  isLive: false,
  lastUpdated: null,
  apiErrors: {},
  summary: { totalSpent: 12200, totalRevenue: 53200, totalConversions: 614, avgRoas: 4.36 },
  byPlatform: {
    google: { spent: 9300, revenue: 41400, conversions: 458, roas: 4.45, activeCampaigns: 2 },
    meta:   { spent: 2100, revenue: 7980,  conversions: 89,  roas: 3.8,  activeCampaigns: 1 },
    tiktok: { spent: 800,  revenue: 4080,  conversions: 67,  roas: 5.1,  activeCampaigns: 0 },
  },
  campaigns: [
    { id: "g1", name: "קמפיין קיץ - Google Shopping", platform: "google", status: "active",  budget: 5000, spent: 3200, impressions: 234000, clicks: 12400, conversions: 148, revenue: 13440, roas: 4.2, ctr: 5.3, cpc: 0.26, cpa: 21.6 },
    { id: "m1", name: "Brand Awareness - Meta",        platform: "meta",   status: "active",  budget: 3000, spent: 2100, impressions: 450000, clicks: 8900,  conversions: 89,  revenue: 7980,  roas: 3.8, ctr: 1.98, cpc: 0.24, cpa: 23.6 },
    { id: "t1", name: "Retargeting - TikTok",          platform: "tiktok", status: "paused",  budget: 1500, spent: 800,  impressions: 120000, clicks: 4200,  conversions: 67,  revenue: 4080,  roas: 5.1, ctr: 3.5, cpc: 0.19, cpa: 11.9 },
    { id: "g2", name: "השקת מוצר - Google",            platform: "google", status: "active",  budget: 8000, spent: 6100, impressions: 380000, clicks: 22000, conversions: 310, revenue: 38430, roas: 6.3, ctr: 5.79, cpc: 0.28, cpa: 19.7 },
    { id: "m2", name: "חגים - Meta DPA",               platform: "meta",   status: "draft",   budget: 4500, spent: 0,    impressions: 0,      clicks: 0,     conversions: 0,   revenue: 0,     roas: 0,   ctr: 0, cpc: 0, cpa: 0 },
  ],
  timeSeries: [
    { date: "2024-01-01", day: "ראש",    spent: 820,  revenue: 3440, roas: 4.2,  clicks: 3100, conversions: 82 },
    { date: "2024-01-02", day: "שני",    spent: 1200, revenue: 5100, roas: 4.25, clicks: 4400, conversions: 110 },
    { date: "2024-01-03", day: "שלישי", spent: 980,  revenue: 4350, roas: 4.44, clicks: 3700, conversions: 96 },
    { date: "2024-01-04", day: "רביעי", spent: 1400, revenue: 6440, roas: 4.6,  clicks: 5200, conversions: 140 },
    { date: "2024-01-05", day: "חמישי", spent: 1100, revenue: 4840, roas: 4.4,  clicks: 4100, conversions: 104 },
    { date: "2024-01-06", day: "שישי",  spent: 1600, revenue: 7360, roas: 4.6,  clicks: 5900, conversions: 162 },
    { date: "2024-01-07", day: "שבת",   spent: 1300, revenue: 5850, roas: 4.5,  clicks: 4800, conversions: 132 },
  ],
};

// ── שמות ימים ────────────────────────────────────────────────────
const DAY_NAMES = ["ראש", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// ── ה-Hook ───────────────────────────────────────────────────────
export function useDashboard(range: DateRange) {
  const [data, setData] = useState<DashboardData>(DEMO_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/dashboard?from=${range.from}&to=${range.to}`,
        { next: { revalidate: 300 } }  // cache 5 דקות
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      if (!json.success) throw new Error(json.error || "API error");

      const { summary, timeSeries, errors } = json.data;

      // המרת timeSeries לפורמט הגרף (הוסף תווית יום קצרה)
      const formattedSeries: TimeSeriesPoint[] = timeSeries.map((p: any) => ({
        ...p,
        day: DAY_NAMES[new Date(p.date).getDay()],
      }));

      setData({
        ...summary,
        campaigns: summary.campaigns,
        timeSeries: formattedSeries,
        byPlatform: summary.byPlatform,
        apiErrors: errors || {},
        isLive: true,
        lastUpdated: json.fetchedAt,
      });
    } catch (err: any) {
      console.warn("API unavailable, falling back to demo data:", err.message);
      // Fallback לדמו – לא מציגים שגיאה למשתמש, רק badge
      setData({ ...DEMO_DATA, apiErrors: { fetch: err.message } });
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── פונקציות עזר לתאריכים ────────────────────────────────────────
export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
