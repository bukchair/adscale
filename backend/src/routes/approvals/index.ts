// ============================================================
// Approvals API Routes
// ============================================================

import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { authenticate } from "../../middleware/auth.js";
import { ApprovalEngine } from "../../engines/approval/index.js";

export async function approvalRoutes(app: FastifyInstance) {
  // GET /approvals — pending approvals queue
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, status = "PENDING", page = "1", limit = "20" } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const where: any = {
      action: { campaign: { adAccount: { organizationId: orgId } } },
      status,
    };

    const [total, requests] = await Promise.all([
      db.approvalRequest.count({ where }),
      db.approvalRequest.findMany({
        where,
        include: {
          action: { include: { campaign: { select: { id: true, name: true } } } },
          reviewer: { select: { id: true, email: true, name: true } },
        },
        orderBy: [{ riskLevel: "desc" }, { createdAt: "asc" }],
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      }),
    ]);

    return { total, page: Number(page), limit: Number(limit), requests };
  });

  // POST /approvals/:id/approve
  app.post("/:id/approve", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as any;
    const { notes } = req.body as any;
    const { orgId } = req.user!;

    const engine = new ApprovalEngine();
    await engine.review({
      requestId: id,
      reviewerId: req.user!.id,
      decision: "approve",
      notes,
      orgId,
    });

    return { success: true };
  });

  // POST /approvals/:id/reject
  app.post("/:id/reject", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as any;
    const { notes } = req.body as any;
    const { orgId } = req.user!;

    const engine = new ApprovalEngine();
    await engine.review({
      requestId: id,
      reviewerId: req.user!.id,
      decision: "reject",
      notes,
      orgId,
    });

    return { success: true };
  });

  // POST /approvals/bulk — bulk approve/reject
  app.post("/bulk", { preHandler: [authenticate] }, async (req, reply) => {
    const { ids, decision, notes } = req.body as any;
    if (!Array.isArray(ids) || ids.length === 0) return reply.status(400).send({ error: "ids required" });

    const engine = new ApprovalEngine();
    const results = await Promise.allSettled(
      ids.map((id: string) =>
        engine.review({ requestId: id, reviewerId: req.user!.id, decision, notes, orgId: req.user?.orgId })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    return { succeeded, failed: results.length - succeeded };
  });
}
