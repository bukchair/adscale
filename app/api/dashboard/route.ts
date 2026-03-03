import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now()-7*86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
  const url = process.env.WOOCOMMERCE_URL;
  if (!url) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  try {
    const res = await fetch(url+"/wp-json/adscale/v1/summary?from="+from+"&to="+to, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("WC error: "+res.status);
    const data = await res.json();
    return NextResponse.json({ summary:{totalSpent:0,totalRevenue:data.totalRevenue,avgRoas:0,totalConversions:data.totalConversions}, timeSeries:[], byPlatform:[{platform:"google",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"meta",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"tiktok",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0}], campaigns:[], isLive:true, lastUpdated:new Date().toISOString(), apiErrors:[] });
  } catch(err:any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
