import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";

const DateRange = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export default async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/campaigns?from=&to=
  app.get("/", async (req, reply) => {
    const q = DateRange.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid date range" });

    const campaigns = await prisma.campaign.findMany({
      where: {
        adAccount: { orgId: (req as any).orgId },
        status: { not: "REMOVED" },
      },
      include: {
        adAccount: { select: { platform: true, name: true } },
        dailyMetrics: {
          where: {
            date: { gte: new Date(q.data.from), lte: new Date(q.data.to) },
          },
        },
        _count: { select: { adGroups: true, searchTerms: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Aggregate metrics per campaign
    return campaigns.map((c) => {
      const m = c.dailyMetrics;
      const spend  = m.reduce((s, d) => s + Number(d.cost), 0);
      const revenue = m.reduce((s, d) => s + Number(d.revenue), 0);
      const clicks  = m.reduce((s, d) => s + d.clicks, 0);
      const impr    = m.reduce((s, d) => s + d.impressions, 0);
      const conv    = m.reduce((s, d) => s + d.conversions, 0);

      return {
        id:           c.id,
        externalId:   c.externalId,
        name:         c.name,
        status:       c.status,
        type:         c.type,
        platform:     c.adAccount.platform,
        budget:       Number(c.budgetAmount),
        spend:        round2(spend),
        revenue:      round2(revenue),
        clicks,
        impressions:  impr,
        conversions:  round2(conv),
        ctr:          impr > 0 ? round4(clicks / impr) : 0,
        cpc:          clicks > 0 ? round2(spend / clicks) : 0,
        cpa:          conv > 0 ? round2(spend / conv) : 0,
        roas:         spend > 0 ? round2(revenue / spend) : 0,
        adGroups:     c._count.adGroups,
        searchTerms:  c._count.searchTerms,
      };
    });
  });

  // GET /api/campaigns/:id
  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = DateRange.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid date range" });

    const c = await prisma.campaign.findFirst({
      where: { id, adAccount: { orgId: (req as any).orgId } },
      include: {
        adAccount: true,
        adGroups:  { include: { _count: { select: { ads: true, keywords: true } } } },
        dailyMetrics: {
          where: { date: { gte: new Date(q.data.from), lte: new Date(q.data.to) } },
          orderBy: { date: "asc" },
        },
        recommendations: {
          where:   { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!c) return reply.code(404).send({ error: "Campaign not found" });
    return c;
  });

  // PATCH /api/campaigns/:id/status
  app.patch("/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ status: z.enum(["ACTIVE", "PAUSED"]) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid status" });

    const c = await prisma.campaign.findFirst({
      where: { id, adAccount: { orgId: (req as any).orgId } },
    });
    if (!c) return reply.code(404).send({ error: "Not found" });

    const updated = await prisma.campaign.update({
      where: { id },
      data:  { status: body.data.status },
    });

    await prisma.auditLog.create({
      data: {
        action:   "campaign.status_changed",
        entity:   "Campaign",
        entityId: id,
        before:   { status: c.status },
        after:    { status: body.data.status },
        userId:   (req as any).userId,
      },
    });

    return updated;
  });
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }
