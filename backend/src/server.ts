// ============================================================
// BScale Backend — Fastify Server
// ============================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { getConfig } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { db } from "./db/client.js";

// Routes
import { authRoutes } from "./routes/auth/index.js";
import { campaignRoutes } from "./routes/campaigns/index.js";
import { searchTermRoutes } from "./routes/search-terms/index.js";
import { recommendationRoutes } from "./routes/recommendations/index.js";
import { approvalRoutes } from "./routes/approvals/index.js";
import { auditRoutes } from "./routes/audit/index.js";
import { profitabilityRoutes } from "./routes/profitability/index.js";
import { creativeRoutes } from "./routes/creative/index.js";

const config = getConfig();

const app = Fastify({
  logger: false, // using pino directly
  trustProxy: true,
});

// ── Plugins ───────────────────────────────────────────────

await app.register(cors, {
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

await app.register(helmet, { contentSecurityPolicy: false });

await app.register(rateLimit, {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
  errorResponseBuilder: () => ({ error: "Too many requests", statusCode: 429 }),
});

// ── Routes ────────────────────────────────────────────────

app.register(authRoutes, { prefix: "/api/v1/auth" });
app.register(campaignRoutes, { prefix: "/api/v1/campaigns" });
app.register(searchTermRoutes, { prefix: "/api/v1/search-terms" });
app.register(recommendationRoutes, { prefix: "/api/v1/recommendations" });
app.register(approvalRoutes, { prefix: "/api/v1/approvals" });
app.register(auditRoutes, { prefix: "/api/v1/audit" });
app.register(profitabilityRoutes, { prefix: "/api/v1/profitability" });
app.register(creativeRoutes, { prefix: "/api/v1/creative" });

// ── Health check ──────────────────────────────────────────

app.get("/health", async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "ok", db: "connected", ts: new Date().toISOString() };
  } catch {
    return { status: "degraded", db: "error" };
  }
});

// ── Error handler ─────────────────────────────────────────

app.setErrorHandler((err, req, reply) => {
  logger.error({ err, url: req.url, method: req.method }, "Request error");
  reply.status(err.statusCode || 500).send({
    error: err.message || "Internal server error",
    statusCode: err.statusCode || 500,
  });
});

// ── Start ─────────────────────────────────────────────────

async function start() {
  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    logger.info(`🚀 BScale Backend running on port ${config.PORT}`);
  } catch (err) {
    logger.error({ err }, "Server failed to start");
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down...");
  await app.close();
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();
