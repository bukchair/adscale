// ============================================================
// AI Recommendations API Routes
// ============================================================

import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { authenticate } from "../../middleware/auth.js";
import { optimizeQueue, classifyQueue } from "../../jobs/queues.js";
import { auditEngine } from "../../engines/audit/index.js";

export async function recommendationRoutes(app: FastifyInstance) {
  // GET /recommendations — list pending recommendations
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, status = "PENDING", severity, type, page = "1", limit = "20" } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const where: any = {
      campaign: { adAccount: { organizationId: orgId } },
      status,
    };
    if (severity) where.severity = severity;
    if (type) where.type = type;

    const [total, recommendations] = await Promise.all([
      db.aiRecommendation.count({ where }),
      db.aiRecommendation.findMany({
        where,
        include: { campaign: { select: { id: true, name: true } } },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      }),
    ]);

    return { total, page: Number(page), limit: Number(limit), recommendations };
  });

  // POST /recommendations/run — trigger optimization analysis
  app.post("/run", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId } = req.user!;
    const { mode = "SUGGESTION", campaignIds } = req.body as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const job = await optimizeQueue.add("manual_run", { orgId, mode, campaignIds });

    await auditEngine.log({
      userId: req.user!.id,
      orgId,
      action: "OPTIMIZATION_RUN_TRIGGERED",
      metadata: { mode, campaignIds, jobId: job.id },
    });

    return { jobId: job.id, status: "queued" };
  });

  // POST /recommendations/:id/dismiss
  app.post("/:id/dismiss", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as any;

    await db.aiRecommendation.update({
      where: { id },
      data: { status: "REJECTED", dismissedAt: new Date(), dismissedBy: req.user!.id },
    });

    return { success: true };
  });

  // GET /recommendations/actions — optimization actions
  app.get("/actions", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, status, severity, page = "1", limit = "20" } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const where: any = {
      campaign: { adAccount: { organizationId: orgId } },
    };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [total, actions] = await Promise.all([
      db.optimizationAction.count({ where }),
      db.optimizationAction.findMany({
        where,
        include: {
          campaign: { select: { id: true, name: true } },
          approvalRequest: true,
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      }),
    ]);

    return { total, page: Number(page), limit: Number(limit), actions };
  });
}
