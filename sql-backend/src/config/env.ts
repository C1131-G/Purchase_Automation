import "dotenv/config";
import { ZodError } from "zod";
import type { z } from "zod";

import { logger } from "@/core/logger/pino-logger";
import { EnvSchema } from "@/validation/schemas/env.schema";

type Env = z.infer<typeof EnvSchema>;
let validatedEnv: Env;

try {
  validatedEnv = EnvSchema.parse(process.env);
  logger.info({ msg: "Environment variables validated successfully" });
} catch (error) {
  if (error instanceof ZodError) {
    const errors = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
    logger.fatal({
      errors,
      msg: "Environment validation failed",
    });
  } else {
    logger.fatal({
      error: (error as Error).message,
      msg: "An unexpected error occurred during environment validation",
    });
  }
  process.exit(1);
}

export const config = {
  nodeEnv: validatedEnv.NODE_ENV,
  server: {
    frontendUrl: validatedEnv.FRONTEND_URL,
    port: validatedEnv.PORT,
    shutdownTimeout: validatedEnv.SHUTDOWN_TIMEOUT,
    trustProxyHops: validatedEnv.TRUST_PROXY_HOPS,
  },
  session: {
    secret: validatedEnv.SESSION_SECRET,
  },
  sql: {
    commonDb: validatedEnv.SQL_COMMON_DB,
    host: validatedEnv.SQL_HOST,
    password: validatedEnv.SQL_PASSWORD,
    port: validatedEnv.SQL_PORT,
    username: validatedEnv.SQL_USER,
  },
};
