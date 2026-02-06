// Environment Configuration: Bridges process.env with the application's config object.
// It performs strict validation at runtime to prevent the server from starting with invalid settings.

import "dotenv/config";

import { type z, ZodError } from "zod";

import { logger } from "@/core/logger/pino-logger";
import { EnvSchema } from "@/validation/schemas/env.schema";

type Env = z.infer<typeof EnvSchema>;
let validatedEnv: Env;

try {
  // Parsing the environment variables against the Zod schema.
  validatedEnv = EnvSchema.parse(process.env);
  logger.info({ msg: "Environment variables validated successfully" });
} catch (error) {
  // Critical failure if environment is misconfigured.
  if (error instanceof ZodError) {
    const errors = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
    logger.fatal({
      msg: "Environment validation failed",
      errors,
    });
  } else {
    logger.fatal({
      msg: "An unexpected error occurred during environment validation",
      error: (error as Error).message,
    });
  }
  process.exit(1);
}

// Global Configuration Object: High-level categories for easy access throughout the codebase.
export const config = {
  hana: {
    host: validatedEnv.HANA_HOST,
    port: validatedEnv.HANA_PORT,
    systemUser: validatedEnv.HANA_USER,
    systemPassword: validatedEnv.HANA_PASSWORD,
    pooling: validatedEnv.HANA_POOLING,
    maxPoolSize: validatedEnv.HANA_MAX_POOL_SIZE,
    connectionLifeTime: validatedEnv.HANA_CONNECTION_LIFE_TIME,
    commonDb: validatedEnv.COMMON_DB,
    organizationTable: validatedEnv.ORGANIZATION_TABLE,
  },
  session: {
    secret: validatedEnv.SESSION_SECRET,
  },
  server: {
    port: validatedEnv.PORT,
    frontendUrl: validatedEnv.FRONTEND_URL,
    shutdownTimeout: validatedEnv.SHUTDOWN_TIMEOUT,
  },
  serviceLayer: {
    serviceLayerURL: validatedEnv.SERVICE_LAYER_URL,
    httpsVerify: validatedEnv.SERVICE_LAYER_HTTPS_VERIFY,
  },
  nodeEnv: validatedEnv.NODE_ENV,
};
