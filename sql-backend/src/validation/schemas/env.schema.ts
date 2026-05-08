import { z } from "zod";

export const EnvSchema = z.object({
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z.coerce.number().default(4001),

  SESSION_SECRET: z.string().min(64, "Session secret must be at least 64 characters"),

  SHUTDOWN_TIMEOUT: z.coerce.number().default(10_000),

  SQL_COMMON_DB: z.string().default("PortalCommon"),

  SQL_HOST: z.string().default("localhost"),

  SQL_PASSWORD: z.string().default(""),

  SQL_PORT: z.coerce.number().default(1433),

  SQL_USER: z.string().default("sa"),

  TRUST_PROXY_HOPS: z.coerce.number().default(1),
});
