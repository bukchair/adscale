import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware } from "../../middleware/auth.js";

export default async function productRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/products
  app.get("/", async (req, reply) => {
    const q = z.object({
      search: z.string().optional(),
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(100).default(50),
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "Invalid params" });

    const { search, page, limit } = q.data;
    const skip = (page - 1) * limit;
    const where: any = { store: { orgId: (req as any).orgId } };
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { name: "asc" },
        include: { costs: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
      }),
      prisma.product.count({ where }),
    ]);

    return { data: items, total, page, pages: Math.ceil(total / limit) };
  });

  // PUT /api/products/:id/cost — set COGS
  app.put("/:id/cost", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      cogs:         z.number().min(0),
      shipping:     z.number().min(0).default(0),
      fees:         z.number().min(0).default(0),
      effectiveFrom: z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const product = await prisma.product.findFirst({
      where: { id, store: { orgId: (req as any).orgId } },
    });
    if (!product) return reply.code(404).send({ error: "Not found" });

    const cost = await prisma.productCost.create({
      data: {
        productId:    id,
        cogs:         body.data.cogs,
        shipping:     body.data.shipping,
        fees:         body.data.fees,
        effectiveFrom: body.data.effectiveFrom ? new Date(body.data.effectiveFrom) : new Date(),
      },
    });

    return cost;
  });
}
