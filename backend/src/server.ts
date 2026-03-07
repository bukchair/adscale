import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { config } from "./config/index.js";
import { logger } from "./logger/index.js";
import { prisma } from "./db/client.js";

// Routes
import authRoutes           from "./routes/auth/index.js";
import campaignRoutes       from "./routes/campaigns/index.js";
import searchTermRoutes     from "./routes/search-terms/index.js";
import negKeywordRoutes     from "./routes/negative-keywords/index.js";
import productRoutes        from "./routes/products/index.js";
import profitabilityRoutes  from "./routes/profitability/index.js";
import recommendationRoutes from "./routes/recommendations/index.js";
import actionRoutes         from "./routes/actions/index.js";
import approvalRoutes       from "./routes/approvals/index.js";
import auditRoutes          from "./routes/audit/index.js";
import settingsRoutes       from "./routes/settings/index.js";

async function bootstrap() {
  const app = Fastify({ logger: false }); // use our pino instance

  // ── Plugins ──────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(jwt, { secret: config.JWT_SECRET });

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, ts: new Date().toISOString() };
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.register(authRoutes,           { prefix: "/api/auth" });
  app.register(campaignRoutes,       { prefix: "/api/campaigns" });
  app.register(searchTermRoutes,     { prefix: "/api/search-terms" });
  app.register(negKeywordRoutes,     { prefix: "/api/negative-keywords" });
  app.register(productRoutes,        { prefix: "/api/products" });
  app.register(profitabilityRoutes,  { prefix: "/api/profitability" });
  app.register(recommendationRoutes, { prefix: "/api/recommendations" });
  app.register(actionRoutes,         { prefix: "/api/actions" });
  app.register(approvalRoutes,       { prefix: "/api/approvals" });
  app.register(auditRoutes,          { prefix: "/api/audit" });
  app.register(settingsRoutes,       { prefix: "/api/settings" });

  // ── Error handler ─────────────────────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    logger.error({ err, req: { method: req.method, url: req.url } }, "Unhandled error");
    const status = err.statusCode ?? 500;
    reply.code(status).send({
      error: status === 500 ? "Internal server error" : err.message,
    });
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  logger.info(`🚀 AdScale backend listening on port ${config.PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, "Fatal startup error");
  process.exit(1);
});
