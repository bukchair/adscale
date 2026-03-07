import pino from "pino";
import { config } from "../config/index.js";

export const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  transport:
    config.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
      : undefined,
  base: { service: "adscale-backend" },
  redact: ["*.accessToken", "*.refreshToken", "*.apiKey", "*.apiSecret", "*.passwordHash"],
});

export type Logger = typeof logger;
