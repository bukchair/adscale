import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  return NextResponse.json({
    summary: { totalSpent: 0, totalRevenue: 0, avgRoas: 0, totalConversions: 0 },
    timeSeries: [],
    byPlatform: [
      { platform: "google", spent: 0, revenue: 0, roas: 0, clicks: 0, conversions: 0, impressions: 0 },
      { platform: "meta", spent: 0, revenue: 0, roas: 0, clicks: 0, conversions: 0, impressions: 0 },
      { platform: "tiktok", spent: 0, revenue: 0, roas: 0, clicks: 0, conversions: 0, impressions: 0 }
    ],
    campaigns: [],
    isLive: false,
    lastUpdated: new Date().toISOString(),
    apiErrors: []
  });
}
