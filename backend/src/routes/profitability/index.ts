// ============================================================
// Profitability Center API Routes
// ============================================================

import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { authenticate } from "../../middleware/auth.js";
import { ProfitEngine } from "../../engines/profit/index.js";

export async function profitabilityRoutes(app: FastifyInstance) {
  // GET /profitability/campaigns — campaign-level profit analysis
  app.get("/campaigns", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, dateFrom, dateTo } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
    const to = dateTo ? new Date(dateTo) : new Date();

    // Get campaigns with metrics
    const campaigns = await db.campaign.findMany({
      where: { adAccount: { organizationId: orgId }, status: "ACTIVE" },
      include: {
        dailyMetrics: { where: { date: { gte: from, lte: to } } },
        adAccount: { select: { currency: true } },
      },
    });

    const engine = new ProfitEngine();

    const inputs = campaigns.map((c) => {
      const totalSpend = c.dailyMetrics.reduce((s, m) => s + Number(m.costMicros) / 1_000_000, 0);
      const totalRevenue = c.dailyMetrics.reduce((s, m) => s + m.revenue, 0);
      const totalConversions = c.dailyMetrics.reduce((s, m) => s + m.conversions, 0);
      const totalImpressions = c.dailyMetrics.reduce((s, m) => s + m.impressions, 0);
      const totalClicks = c.dailyMetrics.reduce((s, m) => s + m.clicks, 0);

      return {
        campaignId: c.id,
        campaignName: c.name,
        adSpend: totalSpend,
        revenue: totalRevenue,
        conversions: totalConversions,
        impressions: totalImpressions,
        clicks: totalClicks,
        products: [], // TODO: cross-reference orders
      };
    });

    const summary = engine.calculateSummary(inputs);
    return summary;
  });

  // GET /profitability/products — product-level profit analysis
  app.get("/products", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, storeId, dateFrom, dateTo, page = "1", limit = "20" } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
    const to = dateTo ? new Date(dateTo) : new Date();

    const products = await db.product.findMany({
      where: { store: { organizationId: orgId, ...(storeId ? { id: storeId } : {}) } },
      include: {
        productCosts: { orderBy: { effectiveFrom: "desc" }, take: 1 },
        orderItems: {
          include: { order: true },
          where: { order: { placedAt: { gte: from, lte: to }, status: { in: ["completed", "processing"] } } },
        },
      },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
    });

    const engine = new ProfitEngine();
    const results = products.map((p) => {
      const cost = p.productCosts[0];
      const revenue = p.orderItems.reduce((s, i) => s + i.totalPrice, 0);
      const quantity = p.orderItems.reduce((s, i) => s + i.quantity, 0);

      return engine.calculateProductProfit({
        productId: p.id,
        productName: p.name,
        revenue,
        adSpend: 0, // TODO: attribute ad spend to products
        cogsCost: (cost?.cogsCost || 0) * quantity,
        shippingCost: (cost?.shippingCost || 0) * quantity,
        platformFee: (cost?.platformFee || 0) * quantity,
        otherCost: (cost?.otherCost || 0) * quantity,
        refundAmount: 0,
        quantity,
      });
    });

    return { products: results, total: products.length };
  });
}
