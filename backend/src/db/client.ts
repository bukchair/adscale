import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

  client.$on("error", (e) => logger.error({ err: e }, "Prisma error"));
  client.$on("warn", (e) => logger.warn({ warn: e }, "Prisma warn"));

  return client;
}

// Prevent multiple instances in development (hot reload)
export const db = globalThis.__prisma ?? createClient();
export const prisma = db;
if (process.env.NODE_ENV !== "production") globalThis.__prisma = db;
