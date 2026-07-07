import "dotenv/config";
import { ZodError } from "zod";
import type { z } from "zod";

import { EnvSchema } from "@/validation/schemas/env.schema";

type Env = z.infer<typeof EnvSchema>;
let validatedEnv: Env;

try {
  validatedEnv = EnvSchema.parse(process.env);
  console.info("Environment variables validated successfully");
} catch (error) {
  if (error instanceof ZodError) {
    const errors = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
    console.error("Environment validation failed:", errors);
  } else {
    console.error("Unexpected error during environment validation:", (error as Error).message);
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
};
