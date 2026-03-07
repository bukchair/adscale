import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware, requireRole } from "../../middleware/auth.js";
import { actionQueue } from "../../jobs/queues.js";

export default async function approvalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/approvals?status=PENDING
  app.get("/", async (req, reply) => {
    const q = z.object({
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"]).default("PENDING"),
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(100).default(20),
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid params" });

    const { status, page, limit } = q.data;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where: {
          status,
          recommendation: { campaign: { adAccount: { orgId: (req as any).orgId } } },
        },
        skip,
        take:    limit,
        orderBy: [{ riskLevel: "asc" }, { createdAt: "asc" }],
        include: {
          recommendation: {
            select: { type: true, title: true, expectedImpact: true, severity: true },
          },
        },
      }),
      prisma.approvalRequest.count({
        where: {
          status,
          recommendation: { campaign: { adAccount: { orgId: (req as any).orgId } } },
        },
      }),
    ]);

    return { data: items, total, page, pages: Math.ceil(total / limit) };
  });

  // POST /api/approvals/:id/approve
  app.post(
    "/:id/approve",
    { preHandler: [requireRole("OWNER", "ADMIN", "EDITOR")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const request = await prisma.approvalRequest.findFirst({
        where: {
          id,
          status: "PENDING",
          recommendation: { campaign: { adAccount: { orgId: (req as any).orgId } } },
        },
        include: { recommendation: true },
      });
      if (!request) return reply.code(404).send({ error: "Not found or already processed" });

      await prisma.approvalRequest.update({
        where: { id },
        data:  { status: "APPROVED", approvedAt: new Date(), approvedById: (req as any).userId },
      });

      // Queue for execution
      if (request.recommendation) {
        await actionQueue.add("approved-action", {
          type:             request.recommendation.type,
          recommendationId: request.recommendation.id,
          orgId:            (req as any).orgId,
          payload:          request.payload as any,
        });
      }

      await prisma.auditLog.create({
        data: {
          action:   "approval.approved",
          entity:   "ApprovalRequest",
          entityId: id,
          userId:   (req as any).userId,
        },
      });

      return { ok: true };
    }
  );

  // POST /api/approvals/:id/reject
  app.post(
    "/:id/reject",
    { preHandler: [requireRole("OWNER", "ADMIN", "EDITOR")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = z.object({ note: z.string().max(500).optional() }).safeParse(req.body);

      await prisma.approvalRequest.updateMany({
        where: {
          id,
          status: "PENDING",
          recommendation: { campaign: { adAccount: { orgId: (req as any).orgId } } },
        },
        data: {
          status:       "REJECTED",
          rejectedAt:   new Date(),
          rejectedNote: body.success ? body.data.note : undefined,
        },
      });

      return { ok: true };
    }
  );

  // GET /api/approvals/count — badge count
  app.get("/count", async (req) => {
    const count = await prisma.approvalRequest.count({
      where: {
        status: "PENDING",
        recommendation: { campaign: { adAccount: { orgId: (req as any).orgId } } },
      },
    });
    return { pending: count };
  });
}
