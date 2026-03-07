import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";

export default async function actionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/actions?status=&type=&page=
  app.get("/", async (req, reply) => {
    const q = z.object({
      status: z.string().optional(),
      type:   z.string().optional(),
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(100).default(20),
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid params" });

    const { status, type, page, limit } = q.data;
    const skip = (page - 1) * limit;
    const where: any = {
      campaign: { adAccount: { orgId: (req as any).orgId } },
    };
    if (status) where.status = status.toUpperCase();
    if (type)   where.type   = type.toUpperCase();

    const [items, total] = await Promise.all([
      prisma.optimizationAction.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.optimizationAction.count({ where }),
    ]);

    return { data: items, total, page, pages: Math.ceil(total / limit) };
  });
}
