import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { authenticate } from "../../middleware/auth.js";
import { CreativeEngine } from "../../engines/creative-gen/index.js";

export async function creativeRoutes(app: FastifyInstance) {
  // POST /creative/generate
  app.post("/generate", { preHandler: [authenticate] }, async (req, reply) => {
    const {
      productName, productDescription, targetAudience, usp, price,
      currency, brandTone, keywords, campaignType, language = "he",
      variantCount = 3
    } = req.body as any;

    if (!productName) return reply.status(400).send({ error: "productName required" });

    const engine = new CreativeEngine();
    const result = await engine.generate(
      { productName, productDescription, targetAudience, usp, price, currency, brandTone, keywords, campaignType, language },
      variantCount
    );

    // Save variants to DB
    const orgId = req.user?.orgId;
    const savedVariants = await Promise.all(
      result.variants.map((v) =>
        db.creativeVariant.create({
          data: {
            type: "RSA",
            headlines: v.headlines,
            descriptions: v.descriptions,
            angle: v.angle,
            hook: v.hook,
            cta: v.cta,
            aiModel: result.model,
            score: v.strengthScore,
            status: "PENDING",
          },
        })
      )
    );

    return { ...result, savedIds: savedVariants.map((v) => v.id) };
  });

  // GET /creative/variants
  app.get("/variants", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, campaignId, status, page = "1", limit = "20" } = req.query as any;

    const variants = await db.creativeVariant.findMany({
      where: {
        ...(campaignId ? { campaignId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
    });

    return { variants };
  });
}
