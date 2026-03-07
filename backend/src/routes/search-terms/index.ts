import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";
import { classifyIntents } from "../../engines/intent-classifier.js";
import { scoreTerms } from "../../engines/query-scorer.js";

export default async function searchTermRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/search-terms?from=&to=&campaignId=&intent=&minCost=&page=&limit=
  app.get("/", async (req, reply) => {
    const q = z.object({
      from:       z.string(),
      to:         z.string(),
      campaignId: z.string().optional(),
      intent:     z.string().optional(),
      minCost:    z.coerce.number().optional(),
      minClicks:  z.coerce.number().optional(),
      page:       z.coerce.number().default(1),
      limit:      z.coerce.number().max(200).default(50),
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid params" });

    const { from, to, campaignId, intent, minCost, minClicks, page, limit } = q.data;
    const skip = (page - 1) * limit;

    const where: any = {
      campaign: { adAccount: { orgId: (req as any).orgId } },
      dateFrom: { gte: new Date(from) },
      dateTo:   { lte: new Date(to) },
    };
    if (campaignId) where.campaignId = campaignId;
    if (intent)     where.intent = intent.toUpperCase();
    if (minCost)    where.cost   = { gte: minCost };
    if (minClicks)  where.clicks = { gte: minClicks };

    const [terms, total] = await Promise.all([
      prisma.searchTerm.findMany({ where, skip, take: limit, orderBy: { cost: "desc" } }),
      prisma.searchTerm.count({ where }),
    ]);

    return { data: terms, total, page, limit, pages: Math.ceil(total / limit) };
  });

  // POST /api/search-terms/classify — trigger AI classification
  app.post("/classify", async (req, reply) => {
    const body = z.object({ ids: z.array(z.string()).max(100) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const terms = await prisma.searchTerm.findMany({
      where: {
        id:       { in: body.data.ids },
        campaign: { adAccount: { orgId: (req as any).orgId } },
      },
    });

    const results = await classifyIntents(terms.map((t) => t.query));

    for (const r of results) {
      const term = terms.find((t) => t.query === r.query);
      if (!term) continue;
      await prisma.searchTerm.update({
        where: { id: term.id },
        data: {
          intent:       r.intent.toUpperCase() as any,
          intentScore:  r.confidence,
          intentReason: r.reason,
          classifiedAt: new Date(),
        },
      });
    }

    return { classified: results.length };
  });

  // GET /api/search-terms/stats — aggregated intent breakdown
  app.get("/stats", async (req, reply) => {
    const q = z.object({ from: z.string(), to: z.string() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid date range" });

    const grouped = await prisma.searchTerm.groupBy({
      by:    ["intent"],
      where: {
        campaign:  { adAccount: { orgId: (req as any).orgId } },
        dateFrom:  { gte: new Date(q.data.from) },
      },
      _count: { _all: true },
      _sum:   { cost: true, clicks: true, conversions: true },
    });

    return grouped.map((g) => ({
      intent:      g.intent,
      count:       g._count._all,
      totalCost:   round2(Number(g._sum.cost ?? 0)),
      totalClicks: g._sum.clicks ?? 0,
      conversions: round2(g._sum.conversions ?? 0),
    }));
  });
}

function round2(n: number) { return Math.round(n * 100) / 100; }
