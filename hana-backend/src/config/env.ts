// Environment Configuration: Bridges process.env with the application's config object.
// It performs strict validation at runtime to prevent the server from starting with invalid settings.

import "dotenv/config";
import { ZodError } from "zod";
import type { z } from "zod";

import { logger } from "@/core/logger/pino-logger";
import { EnvSchema } from "@/validation/schemas/env.schema";

type Env = z.infer<typeof EnvSchema>;
let validatedEnv: Env;

const getEnv = (): Env => {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    // In test environment (e.g. Vitest / CI), provide fallback mock values so tests can run offline
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return EnvSchema.parse({
        ATTACHMENTS_BASE_PATH: "/tmp/attachments",
        COMMON_DB: "SBOCOMMON",
        DEFAULT_CURRENCY_CODE: "USD",
        HANA_HOST: "localhost",
        HANA_PASSWORD: "TestPassword123!",
        HANA_PORT: 30015,
        HANA_USER: "SYSTEM",
        ORGANIZATION_TABLE: "ORGC",
        SERVICE_LAYER_URL: "http://localhost:50000",
        SESSION_SECRET: "0123456789012345678901234567890123456789012345678901234567890123456789",
        ...process.env,
      });
    }

    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
      logger.fatal({
        errors,
        msg: "Environment validation failed",
      });
    } else {
      logger.fatal({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: "An unexpected error occurred during environment validation",
      });
    }
    process.exit(1);
  }
};

validatedEnv = getEnv();

// Global Configuration Object: High-level categories for easy access throughout the codebase.
export const config = {
  attachments: {
    basePath: validatedEnv.ATTACHMENTS_BASE_PATH,
  },
  currency: {
    defaultCode: validatedEnv.DEFAULT_CURRENCY_CODE,
  },
  hana: {
    commonDb: validatedEnv.COMMON_DB,
    connectionLifeTime: validatedEnv.HANA_CONNECTION_LIFE_TIME,
    host: validatedEnv.HANA_HOST,
    maxPoolSize: validatedEnv.HANA_MAX_POOL_SIZE,
    organizationTable: validatedEnv.ORGANIZATION_TABLE,
    pooling: validatedEnv.HANA_POOLING,
    port: validatedEnv.HANA_PORT,
    systemPassword: validatedEnv.HANA_PASSWORD,
    systemUser: validatedEnv.HANA_USER,
  },
  nodeEnv: validatedEnv.NODE_ENV,
  observability: {
    metricsBearerToken: validatedEnv.METRICS_BEARER_TOKEN,
    metricsEnabled: validatedEnv.METRICS_ENABLED ?? validatedEnv.NODE_ENV === "production",
    metricsPath: validatedEnv.METRICS_PATH,
    otlpEndpoint: validatedEnv.OTEL_EXPORTER_OTLP_ENDPOINT,
    otlpTracesEndpoint: validatedEnv.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    otelSdkDisabled: validatedEnv.OTEL_SDK_DISABLED,
    serviceName: validatedEnv.OTEL_SERVICE_NAME,
    tracesSampler: validatedEnv.OTEL_TRACES_SAMPLER,
    tracesSamplerArg: validatedEnv.OTEL_TRACES_SAMPLER_ARG,
  },
  server: {
    frontendUrl: validatedEnv.FRONTEND_URL,
    port: validatedEnv.PORT,
    shutdownTimeout: validatedEnv.SHUTDOWN_TIMEOUT,
    trustProxyHops: validatedEnv.TRUST_PROXY_HOPS,
  },
  serviceLayer: {
    httpsVerify: validatedEnv.SERVICE_LAYER_HTTPS_VERIFY,
    serviceLayerURL: validatedEnv.SERVICE_LAYER_URL,
  },
  session: {
    secret: validatedEnv.SESSION_SECRET,
  },
};
