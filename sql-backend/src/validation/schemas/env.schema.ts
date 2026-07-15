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

  // Fallback Currency
  DEFAULT_CURRENCY_CODE: z.string().min(3).max(3),

  // Observability (metrics + traces)
  OTEL_SDK_DISABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  OTEL_SERVICE_NAME: z.string().min(1).optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
  OTEL_TRACES_SAMPLER: z.enum(["always_on", "always_off", "parentbased_traceidratio"]).optional(),
  OTEL_TRACES_SAMPLER_ARG: z.coerce.number().min(0).max(1).default(0.1),
  METRICS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  METRICS_PATH: z.string().min(1).default("/metrics"),
  METRICS_BEARER_TOKEN: z.string().min(1).optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
