import pino from "pino";
import { getConfig } from "../config/index.js";

const { NODE_ENV } = getConfig();

export const logger = pino(
  NODE_ENV === "production"
    ? { level: "info" }
    : {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
);
