import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";
import { analyzeTerms } from "../../engines/negative-keyword.js";
import { actionQueue } from "../../jobs/queues.js";

export default async function negKeywordRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/negative-keywords/suggestions
  app.get("/suggestions", async (req, reply) => {
    const q = z.object({
      campaignId: z.string().optional(),
      status:     z.enum(["PENDING", "APPLIED", "DISMISSED"]).default("PENDING"),
      page:       z.coerce.number().default(1),
      limit:      z.coerce.number().max(100).default(50),
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid params" });

    const { campaignId, status, page, limit } = q.data;
    const skip = (page - 1) * limit;

    const where: any = {
      searchTerm: { campaign: { adAccount: { orgId: (req as any).orgId } } },
      status,
    };
    if (campaignId) where.searchTerm = { ...where.searchTerm, campaignId };

    const [items, total] = await Promise.all([
      prisma.negativeKeywordSuggestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ confidence: "desc" }, { wasteAmount: "desc" }],
        include: { searchTerm: { select: { query: true, campaignId: true, cost: true } } },
      }),
      prisma.negativeKeywordSuggestion.count({ where }),
    ]);

    return { data: items, total, page, pages: Math.ceil(total / limit) };
  });

  // POST /api/negative-keywords/analyze — run analysis on a campaign's search terms
  app.post("/analyze", async (req, reply) => {
    const body = z.object({
      campaignId: z.string(),
      dateFrom:   z.string(),
      dateTo:     z.string(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const terms = await prisma.searchTerm.findMany({
      where: {
        campaignId: body.data.campaignId,
        campaign:   { adAccount: { orgId: (req as any).orgId } },
        dateFrom:   { gte: new Date(body.data.dateFrom) },
      },
      orderBy: { cost: "desc" },
      take: 500,
    });

    const suggestions = await analyzeTerms(
      terms.map((t) => ({
        query:       t.query,
        cost:        Number(t.cost),
        conversions: t.conversions,
        clicks:      t.clicks,
      }))
    );

    // Persist suggestions
    let created = 0;
    for (const s of suggestions) {
      const term = terms.find((t) => t.query === s.query);
      if (!term) continue;
      await prisma.negativeKeywordSuggestion.upsert({
        where:  { id: `${term.id}:${s.suggestion}` },
        create: {
          id:           `${term.id}:${s.suggestion}`,
          searchTermId: term.id,
          query:        s.query,
          suggestion:   s.suggestion,
          matchType:    s.matchType,
          confidence:   s.confidence,
          riskLevel:    s.riskLevel,
          reason:       s.reason,
          wasteAmount:  s.wasteAmount,
        },
        update: { confidence: s.confidence, wasteAmount: s.wasteAmount },
      });
      created++;
    }

    return { analyzed: terms.length, suggestions: created };
  });

  // POST /api/negative-keywords/apply — apply selected suggestions
  app.post("/apply", async (req, reply) => {
    const body = z.object({
      ids:        z.array(z.string()),
      campaignId: z.string(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const suggestions = await prisma.negativeKeywordSuggestion.findMany({
      where: {
        id:         { in: body.data.ids },
        searchTerm: { campaign: { adAccount: { orgId: (req as any).orgId } } },
      },
    });

    // Queue for execution
    await actionQueue.add("neg-kw-add", {
      type:             "NEGATIVE_KW_ADD",
      recommendationId: "",
      orgId:            (req as any).orgId,
      payload:          {
        campaignId: body.data.campaignId,
        keywords:   suggestions.map((s) => ({ text: s.suggestion, matchType: s.matchType })),
      },
    });

    // Mark as applied
    await prisma.negativeKeywordSuggestion.updateMany({
      where: { id: { in: body.data.ids } },
      data:  { status: "APPLIED", appliedAt: new Date() },
    });

    return { applied: suggestions.length };
  });

  // POST /api/negative-keywords/dismiss
  app.post("/dismiss", async (req, reply) => {
    const body = z.object({ ids: z.array(z.string()) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    await prisma.negativeKeywordSuggestion.updateMany({
      where: {
        id:         { in: body.data.ids },
        searchTerm: { campaign: { adAccount: { orgId: (req as any).orgId } } },
      },
      data: { status: "DISMISSED", dismissedAt: new Date() },
    });

    return { dismissed: body.data.ids.length };
  });
}
