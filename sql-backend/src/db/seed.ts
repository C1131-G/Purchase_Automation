/**
 * CLI entry for `pnpm db:seed`.
 * Implementation lives under `./seed/` (split seed modules).
 */
import "dotenv/config";

import { logger } from "@/core/logger/pino-logger";

import { runSeed } from "./seed/seed.runner";

runSeed().catch((err: unknown) => {
  logger.fatal(
    { err: err instanceof Error ? err : new Error(String(err)) },
    "Registry/Tenant dynamic seeding failed",
  );
  process.exit(1);
});
