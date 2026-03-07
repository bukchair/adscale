import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";
import { calcCampaignProfit, calcProductProfit } from "../../engines/profit-engine.js";

export default async function profitabilityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  const DateRange = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  // GET /api/profitability/campaigns
  app.get("/campaigns", async (req, reply) => {
    const q = DateRange.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid date range" });

    const campaigns = await prisma.campaign.findMany({
      where:   { adAccount: { orgId: (req as any).orgId }, status: { not: "REMOVED" } },
      select:  { id: true },
    });

    const results = await Promise.all(
      campaigns.map((c) =>
        calcCampaignProfit(c.id, new Date(q.data.from), new Date(q.data.to)).catch(() => null)
      )
    );

    return results
      .filter(Boolean)
      .sort((a, b) => (b?.netProfit ?? 0) - (a?.netProfit ?? 0));
  });

  // GET /api/profitability/products
  app.get("/products", async (req, reply) => {
    const q = DateRange.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid date range" });

    const stores = await prisma.storeIntegration.findMany({
      where:  { orgId: (req as any).orgId, isActive: true },
      select: { id: true },
    });

    const results = await Promise.all(
      stores.map((s) =>
        calcProductProfit(s.id, new Date(q.data.from), new Date(q.data.to))
      )
    );

    return results.flat().sort((a, b) => b.netProfit - a.netProfit);
  });

  // GET /api/profitability/summary
  app.get("/summary", async (req, reply) => {
    const q = DateRange.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid date range" });

    const from = new Date(q.data.from);
    const to   = new Date(q.data.to);

    const metrics = await prisma.dailyMetric.aggregate({
      where: {
        campaign:  { adAccount: { orgId: (req as any).orgId } },
        date:      { gte: from, lte: to },
      },
      _sum: {
        cost:            true,
        revenue:         true,
        conversions:     true,
        impressions:     true,
        clicks:          true,
      },
    });

    const spend   = Number(metrics._sum.cost ?? 0);
    const revenue = Number(metrics._sum.revenue ?? 0);
    const conv    = metrics._sum.conversions ?? 0;
    const clicks  = metrics._sum.clicks ?? 0;
    const impr    = metrics._sum.impressions ?? 0;

    // Estimate orders for COGS (simplified)
    const orders = await prisma.order.aggregate({
      where: {
        store:     { orgId: (req as any).orgId },
        orderedAt: { gte: from, lte: to },
        status:    { in: ["COMPLETED", "PROCESSING"] },
      },
      _sum: {
        total:      true,
        shipping:   true,
        refundTotal: true,
      },
    });

    const shipping = Number(orders._sum.shipping ?? 0);
    const refunds  = Number(orders._sum.refundTotal ?? 0);
    const netProfit = revenue - spend - shipping - refunds;

    return {
      dateFrom:     q.data.from,
      dateTo:       q.data.to,
      totalSpend:   round2(spend),
      totalRevenue: round2(revenue),
      netProfit:    round2(netProfit),
      roas:         spend > 0 ? round2(revenue / spend) : 0,
      profitMargin: revenue > 0 ? round4(netProfit / revenue) : 0,
      conversions:  round2(conv),
      cpa:          conv > 0 ? round2(spend / conv) : 0,
      ctr:          impr > 0 ? round4(clicks / impr) : 0,
      impressions:  impr,
      clicks,
    };
  });
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }
