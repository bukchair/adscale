import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now()-7*86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
  const url = process.env.WOOCOMMERCE_URL;
  const ck = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!url || !ck || !cs) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  try {
    const auth = Buffer.from(ck+":"+cs).toString("base64");
    const res = await fetch(url+"/wp-json/wc/v3/reports/sales?date_min="+from+"&date_max="+to, { headers: { Authorization: "Basic "+auth } });
    if (!res.ok) throw new Error("WC error: "+res.status);
    const report = await res.json();
    const r = report[0] || {};
    const totalRevenue = parseFloat(r.total_sales || "0");
    const totalConversions = parseInt(r.num_orders || "0");
    return NextResponse.json({ summary:{totalSpent:0,totalRevenue,avgRoas:0,totalConversions}, timeSeries:[], byPlatform:[{platform:"google",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"meta",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"tiktok",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0}], campaigns:[], isLive:true, lastUpdated:new Date().toISOString(), apiErrors:[] });
  } catch(err:any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
