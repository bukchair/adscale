import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:        z.enum(["development", "production", "test"]).default("development"),
  PORT:            z.coerce.number().default(4000),
  DATABASE_URL:    z.string().url(),
  REDIS_URL:       z.string().default("redis://localhost:6379"),
  JWT_SECRET:      z.string().min(32),

  // Google Ads
  GOOGLE_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_CLIENT_ID:       z.string().optional(),
  GOOGLE_CLIENT_SECRET:   z.string().optional(),

  // Meta
  META_APP_ID:     z.string().optional(),
  META_APP_SECRET: z.string().optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY:    z.string().optional(),

  // Encryption
  ENCRYPTION_KEY:  z.string().min(32).optional(),

  // Execution mode (default to safe)
  DEFAULT_EXEC_MODE: z
    .enum(["DRY_RUN", "SUGGEST", "APPROVAL_REQUIRED", "AUTOMATED"])
    .default("SUGGEST"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
