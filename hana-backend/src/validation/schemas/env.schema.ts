// Environment Variable Validation Schema: Ensures all required configuration is present and correctly typed at startup.
// Uses Zod for strict validation and automatic coercion of numeric/boolean values from strings.

import { z } from "zod";

export const EnvSchema = z.object({
  // Database Configuration: Essential for establishing the HANA pool and connecting to the Common database.
  HANA_HOST: z.string().min(1).trim(),
  HANA_PORT: z.coerce.number().int().positive(),
  HANA_USER: z.string().min(1).trim(),
  HANA_PASSWORD: z.string().min(1).trim(),

  // Security & Web: Secret for session signing and CORS origin for the frontend.
  SESSION_SECRET: z.string().min(64).trim(),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),

  // SAP Service Layer: Remote API connection for transactional writes.
  SERVICE_LAYER_URL: z.string().url(),

  ATTACHMENTS_BASE_PATH: z.string().min(1).trim(),

  // Registry: Location of the center-of-truth table for multi-tenancy.
  COMMON_DB: z.string().min(1).trim(),
  ORGANIZATION_TABLE: z.string().min(1).trim(),

  // Lifecycle: Environment mode and connection pooling parameters for performance tuning.
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HANA_POOLING: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .default("false"),
  SERVICE_LAYER_HTTPS_VERIFY: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .default("false"),
  SHUTDOWN_TIMEOUT: z.coerce.number().int().positive().default(10_000),
  HANA_MAX_POOL_SIZE: z.coerce.number().int().positive().default(30),
  HANA_CONNECTION_LIFE_TIME: z.coerce.number().int().positive().default(3600),
  DEFAULT_CURRENCY_CODE: z.string().min(3).max(3),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
