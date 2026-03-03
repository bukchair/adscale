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
    const endpoint = url+"/wp-json/wc/v3/orders?after="+from+"T00:00:00&before="+to+"T23:59:59&per_page=10&status=completed,processing&orderby=date&order=desc&fields=id,total,date_created";
    const res = await fetch(endpoint, { headers: { Authorization: "Basic "+auth }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("WC error: "+res.status);
    const orders = await res.json();
    const totalRevenue = orders.reduce((s:number,o:any) => s+parseFloat(o.total||"0"), 0);
    const totalConversions = orders.length;
    return NextResponse.json({ summary:{totalSpent:0,totalRevenue,avgRoas:0,totalConversions}, timeSeries:[], byPlatform:[{platform:"google",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"meta",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"tiktok",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0}], campaigns:[], isLive:true, lastUpdated:new Date().toISOString(), apiErrors:[] });
  } catch(err:any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
