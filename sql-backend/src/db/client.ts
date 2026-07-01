import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

let db: ReturnType<typeof drizzle> | null = null;
let pool: pg.Pool | null = null;

export async function initializeDatabase() {
  pool = new pg.Pool({
    connectionString: config.postgres.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
  });

  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("PostgreSQL connection established");
  } finally {
    client.release();
  }

  db = drizzle(pool);
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info("PostgreSQL pool closed");
    pool = null;
    db = null;
  }
}
