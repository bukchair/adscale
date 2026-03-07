import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";
import { generateRecommendations, persistRecommendations } from "../../engines/recommendation-engine.js";
import { routeRecommendation } from "../../engines/approval-engine.js";

export default async function recommendationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/recommendations?status=&type=&severity=&page=
  app.get("/", async (req, reply) => {
    const q = z.object({
      status:   z.string().optional(),
      type:     z.string().optional(),
      severity: z.string().optional(),
      page:     z.coerce.number().default(1),
      limit:    z.coerce.number().max(100).default(20),
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid params" });

    const { status, type, severity, page, limit } = q.data;
    const skip = (page - 1) * limit;
    const where: any = {
      campaign: { adAccount: { orgId: (req as any).orgId } },
    };
    if (status)   where.status   = status.toUpperCase();
    if (type)     where.type     = type.toUpperCase();
    if (severity) where.severity = severity.toUpperCase();

    const [items, total] = await Promise.all([
      prisma.aiRecommendation.findMany({
        where,
        skip,
        take:    limit,
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        include: {
          campaign:       { select: { name: true, status: true } },
          approvalRequest: { select: { status: true, riskLevel: true } },
        },
      }),
      prisma.aiRecommendation.count({ where }),
    ]);

    return { data: items, total, page, pages: Math.ceil(total / limit) };
  });

  // POST /api/recommendations/generate — trigger fresh generation
  app.post("/generate", async (req, reply) => {
    const body = z.object({
      from: z.string(),
      to:   z.string(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const recs = await generateRecommendations(
      (req as any).orgId,
      new Date(body.data.from),
      new Date(body.data.to)
    );
    await persistRecommendations(recs);

    return { generated: recs.length };
  });

  // POST /api/recommendations/:id/execute
  app.post("/:id/execute", async (req, reply) => {
    const { id } = req.params as { id: string };

    const rec = await prisma.aiRecommendation.findFirst({
      where: { id, campaign: { adAccount: { orgId: (req as any).orgId } } },
    });
    if (!rec) return reply.code(404).send({ error: "Not found" });
    if (rec.status !== "PENDING") return reply.code(409).send({ error: "Already processed" });

    const org = await prisma.organization.findUniqueOrThrow({
      where:   { id: (req as any).orgId },
      include: { settings: { where: { key: "exec_mode" } } },
    });
    const execMode = (org.settings[0]?.value as any) ?? "SUGGEST";

    const result = await routeRecommendation(
      {
        type:           rec.type,
        title:          rec.title,
        reason:         rec.reason,
        confidence:     rec.confidence,
        severity:       rec.severity,
        expectedImpact: rec.expectedImpact ?? undefined,
        payload:        rec.payload as any,
        campaignId:     rec.campaignId ?? undefined,
      },
      execMode
    );

    return { result };
  });

  // POST /api/recommendations/:id/dismiss
  app.post("/:id/dismiss", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.aiRecommendation.updateMany({
      where: { id, campaign: { adAccount: { orgId: (req as any).orgId } } },
      data:  { status: "REJECTED", dismissedAt: new Date() },
    });
    return { ok: true };
  });
}
