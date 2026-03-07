import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { authMiddleware, requireRole } from "../../middleware/auth.js";
import { syncQueue, scheduleRecurringJobs } from "../../jobs/queues.js";

export default async function settingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /api/settings
  app.get("/", async (req) => {
    const settings = await prisma.setting.findMany({
      where: { orgId: (req as any).orgId },
    });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  });

  // PUT /api/settings/:key
  app.put("/:key", { preHandler: [requireRole("OWNER", "ADMIN")] }, async (req, reply) => {
    const { key } = req.params as { key: string };
    const body = z.object({ value: z.any() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const setting = await prisma.setting.upsert({
      where:  { orgId_key: { orgId: (req as any).orgId, key } },
      create: { orgId: (req as any).orgId, key, value: body.data.value },
      update: { value: body.data.value },
    });

    return setting;
  });

  // GET /api/settings/integrations — list all ad accounts and stores
  app.get("/integrations", async (req) => {
    const [adAccounts, stores] = await Promise.all([
      prisma.adAccount.findMany({
        where:  { orgId: (req as any).orgId },
        select: {
          id: true, platform: true, name: true,
          isActive: true, lastSyncAt: true, externalId: true,
        },
      }),
      prisma.storeIntegration.findMany({
        where:  { orgId: (req as any).orgId },
        select: {
          id: true, platform: true, storeUrl: true,
          isActive: true, lastSyncAt: true,
        },
      }),
    ]);
    return { adAccounts, stores };
  });

  // POST /api/settings/sync/trigger — manual sync trigger
  app.post("/sync/trigger", { preHandler: [requireRole("OWNER", "ADMIN")] }, async (req, reply) => {
    const body = z.object({
      type:        z.string(),
      adAccountId: z.string().optional(),
      storeId:     z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const job = await syncQueue.add("manual-sync", {
      type:         body.data.type as any,
      orgId:        (req as any).orgId,
      adAccountId:  body.data.adAccountId,
      storeId:      body.data.storeId,
    });

    return { jobId: job.id, queued: true };
  });
}
