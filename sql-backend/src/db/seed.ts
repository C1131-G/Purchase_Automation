import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

async function runSeed() {
  logger.info("Starting database seed...");

  const pool = new pg.Pool({
    connectionString: config.postgres.databaseUrl,
  });

  const _db = drizzle(pool);

  // TODO: Add seed data here
  // - Admin user
  // - Master data (business partners, items, warehouses, etc.)

  logger.info("Seed completed");
  await pool.end();
}

runSeed().catch((err) => {
  logger.fatal({ err }, "Seed failed");
  process.exit(1);
});
