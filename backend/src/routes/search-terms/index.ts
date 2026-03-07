// ============================================================
// Search Terms Intelligence API Routes
// ============================================================

import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { authenticate } from "../../middleware/auth.js";
import { classifyQueue } from "../../jobs/queues.js";

export async function searchTermRoutes(app: FastifyInstance) {
  // GET /search-terms — paginated list with filters
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const {
      orgId, campaignId, intent, riskLevel, minScore, maxScore,
      dateFrom, dateTo, search,
      page = "1", limit = "50",
      sortBy = "costMicros", sortDir = "desc"
    } = req.query as any;

    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const where: any = {
      campaign: { adAccount: { organizationId: orgId } },
    };
    if (campaignId) where.campaignId = campaignId;
    if (intent) where.intent = intent;
    if (riskLevel) where.riskLevel = riskLevel;
    if (minScore) where.score = { gte: Number(minScore) };
    if (maxScore) where.score = { ...where.score, lte: Number(maxScore) };
    if (search) where.query = { contains: search, mode: "insensitive" };
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const orderBy: any = { [sortBy]: sortDir };

    const [total, terms] = await Promise.all([
      db.searchTerm.count({ where }),
      db.searchTerm.findMany({
        where,
        include: { campaign: { select: { id: true, name: true } } },
        orderBy,
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      }),
    ]);

    // Summary stats
    const stats = await db.searchTerm.aggregate({
      where,
      _sum: { clicks: true, impressions: true, conversions: true },
      _sum: { costMicros: true } as any,
    });

    return { total, page: Number(page), limit: Number(limit), terms, stats };
  });

  // GET /search-terms/summary — intent distribution
  app.get("/summary", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, campaignId, dateFrom, dateTo } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const where: any = { campaign: { adAccount: { organizationId: orgId } } };
    if (campaignId) where.campaignId = campaignId;
    if (dateFrom) where.date = { gte: new Date(dateFrom) };
    if (dateTo) where.date = { ...where.date, lte: new Date(dateTo) };

    const byIntent = await db.searchTerm.groupBy({
      by: ["intent"],
      where,
      _count: { id: true },
      _sum: { clicks: true, conversions: true },
    });

    const byRisk = await db.searchTerm.groupBy({
      by: ["riskLevel"],
      where,
      _count: { id: true },
    });

    return { byIntent, byRisk };
  });

  // POST /search-terms/classify — trigger AI classification
  app.post("/classify", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, campaignId } = req.body as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    // Find unclassified search terms
    const unclassified = await db.searchTerm.findMany({
      where: {
        campaign: { adAccount: { organizationId: orgId } },
        ...(campaignId ? { campaignId } : {}),
        classifiedAt: null,
      },
      select: { id: true, campaignId: true },
      take: 500,
    });

    if (unclassified.length === 0) return { queued: 0, message: "All terms already classified" };

    // Group by campaign and queue
    const byCampaign = unclassified.reduce<Record<string, string[]>>((acc, t) => {
      if (!acc[t.campaignId]) acc[t.campaignId] = [];
      acc[t.campaignId].push(t.id);
      return acc;
    }, {});

    let jobCount = 0;
    for (const [cId, queryIds] of Object.entries(byCampaign)) {
      await classifyQueue.add("classify", { orgId, campaignId: cId, queryIds });
      jobCount++;
    }

    return { queued: unclassified.length, jobs: jobCount };
  });
}
