import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

async function runMigrations() {
  logger.info("Starting database migrations...");

  const pool = new pg.Pool({
    connectionString: config.postgres.databaseUrl,
  });

  const db = drizzle(pool);

  await migrate(db, {
    migrationsFolder: "./src/db/migrations",
  });

  logger.info("Migrations completed successfully");
  await pool.end();
}

runMigrations().catch((err) => {
  logger.fatal({ err }, "Migration failed");
  process.exit(1);
});
