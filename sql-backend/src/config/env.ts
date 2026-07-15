import "dotenv/config";
import { ZodError } from "zod";
import type { z } from "zod";

import { logger } from "@/core/logger/pino-logger";
import { EnvSchema } from "@/validation/schemas/env.schema";

type Env = z.infer<typeof EnvSchema>;
let validatedEnv: Env;

try {
  validatedEnv = EnvSchema.parse(process.env);
  logger.info("Environment variables validated successfully");
} catch (error) {
  if (error instanceof ZodError) {
    const errors = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
    logger.fatal({ errors }, "Environment validation failed");
  } else {
    logger.fatal(
      { err: error instanceof Error ? error : new Error(String(error)) },
      "Unexpected error during environment validation",
    );
  }
  process.exit(1);
}

export const config = {
  server: {
    port: validatedEnv.PORT,
    nodeEnv: validatedEnv.NODE_ENV,
    frontendUrl: validatedEnv.FRONTEND_URL,
    trustProxyHops: validatedEnv.TRUST_PROXY_HOPS,
    shutdownTimeout: validatedEnv.SHUTDOWN_TIMEOUT,
  },
  postgres: {
    databaseUrl: validatedEnv.DATABASE_URL,
  },
  attachments: {
    basePath: validatedEnv.ATTACHMENTS_BASE_PATH,
  },
  session: {
    secret: validatedEnv.SESSION_SECRET,
  },
  currency: {
    defaultCode: validatedEnv.DEFAULT_CURRENCY_CODE,
  },
  observability: {
    otelSdkDisabled: validatedEnv.OTEL_SDK_DISABLED,
    serviceName: validatedEnv.OTEL_SERVICE_NAME,
    otlpEndpoint: validatedEnv.OTEL_EXPORTER_OTLP_ENDPOINT,
    otlpTracesEndpoint: validatedEnv.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    tracesSampler: validatedEnv.OTEL_TRACES_SAMPLER,
    tracesSamplerArg: validatedEnv.OTEL_TRACES_SAMPLER_ARG,
    metricsEnabled: validatedEnv.METRICS_ENABLED,
    metricsPath: validatedEnv.METRICS_PATH,
    metricsBearerToken: validatedEnv.METRICS_BEARER_TOKEN,
  },
};
