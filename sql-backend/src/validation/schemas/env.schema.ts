import { z } from "zod";

export const EnvSchema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(4001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),

  // PostgreSQL
  DATABASE_URL: z.string().url().trim().startsWith("postgresql://"),

  // Logging
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  // Session
  SESSION_SECRET: z.string().min(32).trim(),

  // Attachments
  ATTACHMENTS_BASE_PATH: z.string().default("./uploads"),

  // Lifecycle
  SHUTDOWN_TIMEOUT: z.coerce.number().int().positive().default(10_000),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
