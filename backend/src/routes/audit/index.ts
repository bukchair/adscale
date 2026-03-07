import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";

export default async function auditRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/audit?from=&to=&action=&entity=&page=
  app.get("/", async (req, reply) => {
    const q = z.object({
      from:   z.string().optional(),
      to:     z.string().optional(),
      action: z.string().optional(),
      entity: z.string().optional(),
      userId: z.string().optional(),
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(200).default(50),
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid params" });

    const { from, to, action, entity, userId, page, limit } = q.data;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (from)   where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(from) };
    if (to)     where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(to) };
    if (action) where.action    = { contains: action, mode: "insensitive" };
    if (entity) where.entity    = entity;
    if (userId) where.userId    = userId;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data: items, total, page, pages: Math.ceil(total / limit) };
  });
}
