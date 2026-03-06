import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { auditEngine } from "../../engines/audit/index.js";

export async function auditRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, userId, entityType, entityId, action, from, to, page = "1", limit = "50" } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    return auditEngine.query({
      orgId,
      userId,
      entityType,
      entityId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    });
  });
}
