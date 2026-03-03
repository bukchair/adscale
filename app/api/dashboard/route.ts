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
    const res = await fetch(url+"/wp-json/wc/v3/orders?after="+from+"T00:00:00&before="+to+"T23:59:59&per_page=100&status=completed,processing", { headers: { Authorization: "Basic "+auth } });
    if (!res.ok) throw new Error("WC error: "+res.status);
    const orders = await res.json();
    const totalRevenue = orders.reduce((s:number,o:any) => s+parseFloat(o.total||"0"), 0);
    const totalConversions = orders.length;
    const days = ["א","ב","ג","ד","ה","ו","ש"];
    const dayMap:Record<string,{revenue:number;conversions:number}> = {};
    orders.forEach((o:any) => {
      const d = o.date_created?.split("T")[0]||"";
      if (!dayMap[d]) dayMap[d]={revenue:0,conversions:0};
      dayMap[d].revenue+=parseFloat(o.total||"0");
      dayMap[d].conversions+=1;
    });
    const timeSeries = Object.entries(dayMap).sort(([a],[b])=>a.localeCompare(b)).map(([date,d])=>({ date, day:days[new Date(date).getDay()], spent:0, revenue:d.revenue, clicks:0, conversions:d.conversions, roas:0 }));
    return NextResponse.json({ summary:{totalSpent:0,totalRevenue,avgRoas:0,totalConversions}, timeSeries, byPlatform:[{platform:"google",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"meta",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0},{platform:"tiktok",spent:0,revenue:0,roas:0,clicks:0,conversions:0,impressions:0}], campaigns:[], isLive:true, lastUpdated:new Date().toISOString(), apiErrors:[] });
  } catch(err:any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

**Ctrl+S** ← ואז ב-cmd:
```
git add .
git commit -m "woo api simple"
git push