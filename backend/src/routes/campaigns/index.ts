// ============================================================
// Campaigns API Routes
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { authenticate } from "../../middleware/auth.js";
import { syncQueue } from "../../jobs/queues.js";

export async function campaignRoutes(app: FastifyInstance) {
  // GET /campaigns — list campaigns for an org
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { orgId, platform, status, page = "1", limit = "20" } = req.query as any;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const where: any = {
      adAccount: { organizationId: orgId },
    };
    if (platform) where.adAccount.platform = platform;
    if (status) where.status = status;

    const [total, campaigns] = await Promise.all([
      db.campaign.count({ where }),
      db.campaign.findMany({
        where,
        include: {
          adAccount: { select: { platform: true, name: true, currency: true } },
          dailyMetrics: { orderBy: { date: "desc" }, take: 7 },
        },
        orderBy: { updatedAt: "desc" },
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      }),
    ]);

    return { total, page: Number(page), limit: Number(limit), campaigns };
  });

  // GET /campaigns/:id — campaign details
  app.get("/:id", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as any;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        adAccount: true,
        dailyMetrics: { orderBy: { date: "desc" }, take: 30 },
        hourlyMetrics: { orderBy: { hour: "desc" }, take: 48 },
        recommendations: { where: { status: "PENDING" }, take: 10 },
      },
    });

    if (!campaign) return reply.status(404).send({ error: "Campaign not found" });
    return campaign;
  });

  // POST /campaigns/:id/sync — trigger manual sync
  app.post("/:id/sync", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as any;
    const { orgId } = req.user!;
    if (!orgId) return reply.status(400).send({ error: "orgId required" });

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: { adAccount: true },
    });
    if (!campaign) return reply.status(404).send({ error: "Campaign not found" });

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    await syncQueue.add("metrics", {
      type: "metrics",
      adAccountId: campaign.adAccountId,
      orgId,
      dateFrom: weekAgo,
      dateTo: today,
    });

    return { queued: true };
  });
}
