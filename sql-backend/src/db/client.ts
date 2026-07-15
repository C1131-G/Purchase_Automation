import { drizzle } from "drizzle-orm/node-postgres";
import postgres from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { registerPoolGauges } from "@/core/observability/metrics";

export interface TenantContext {
  db: ReturnType<typeof drizzle>;
  dbName: string;
}

export const dbContext = new AsyncLocalStorage<TenantContext>();

let registryDb: ReturnType<typeof drizzle> | null = null;
let registryPool: postgres.Pool | null = null;

const pools = new Map<string, postgres.Pool>();
const dbInstances = new Map<string, ReturnType<typeof drizzle>>();

function getConnectionStringForDb(dbName: string): string {
  const url = new URL(config.postgres.databaseUrl);
  url.pathname = `/${dbName}`;
  return url.toString();
}

async function ensureColumnsExist(pool: postgres.Pool, dbName: string) {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE goods_issues ADD COLUMN IF NOT EXISTS jrnl_memo TEXT;
      ALTER TABLE goods_issues ADD COLUMN IF NOT EXISTS ref2 TEXT;
      ALTER TABLE goods_issues ADD COLUMN IF NOT EXISTS series INTEGER;
      ALTER TABLE goods_issues ADD COLUMN IF NOT EXISTS price_list INTEGER;
      ALTER TABLE goods_issues ADD COLUMN IF NOT EXISTS attachment_entry INTEGER;

      ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS price_list INTEGER;
      ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS attachment_entry INTEGER;

      ALTER TABLE goods_issue_lines ADD COLUMN IF NOT EXISTS ocr_code TEXT;
      ALTER TABLE goods_issue_lines ADD COLUMN IF NOT EXISTS uom_code TEXT;
      ALTER TABLE goods_issue_lines ADD COLUMN IF NOT EXISTS unit_msr TEXT;
      ALTER TABLE goods_issue_lines ADD COLUMN IF NOT EXISTS bin_allocations JSONB;

      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS ocr_code TEXT;
      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS unit_msr TEXT;
      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS bin_allocations JSONB;

      ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS bill_to_def TEXT;
      ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS ship_to_def TEXT;
    `);
    logger.info({ dbName }, "Verified goods issue/receipt database columns exist");
  } catch (err) {
    logger.error({ err, dbName }, "Error verifying database columns");
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  registryPool = new postgres.Pool({
    connectionString: config.postgres.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
  });

  const client = await registryPool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("Registry PostgreSQL connection established");
  } finally {
    client.release();
  }

  registryDb = drizzle(registryPool);

  const defaultDbName = new URL(config.postgres.databaseUrl).pathname.substring(1);
  pools.set(defaultDbName, registryPool);
  dbInstances.set(defaultDbName, registryDb);

  await ensureColumnsExist(registryPool, defaultDbName);

  // Observable pool gauges for Prometheus (idle/active/waiting).
  registerPoolGauges(() =>
    Array.from(pools.entries()).map(([name, pool]) => ({
      pool: name === defaultDbName ? "registry" : "tenant",
      idle: pool.idleCount,
      active: Math.max(0, pool.totalCount - pool.idleCount),
      waiting: pool.waitingCount,
    })),
  );

  return registryDb;
}

export function getDbForTenant(dbName: string) {
  let tenantPool = pools.get(dbName);
  let tenantDb = dbInstances.get(dbName);

  if (!tenantPool) {
    const connectionString = getConnectionStringForDb(dbName);
    logger.info({ dbName }, "Initializing connection pool for tenant database");
    tenantPool = new postgres.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pools.set(dbName, tenantPool);
    tenantDb = drizzle(tenantPool);
    dbInstances.set(dbName, tenantDb);

    ensureColumnsExist(tenantPool, dbName).catch((err) => {
      logger.error({ err, dbName }, "Background column verification failed");
    });
  }

  return tenantDb!;
}

export function getDb() {
  const activeContext = dbContext.getStore();
  if (activeContext?.db) {
    return activeContext.db;
  }

  if (!registryDb) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return registryDb;
}

export function getRegistryDb() {
  if (!registryDb) {
    throw new Error("Registry database not initialized. Call initializeDatabase() first.");
  }
  return registryDb;
}

export async function ensureDatabaseExists(dbName: string, connectionString: string) {
  const url = new URL(connectionString);
  url.pathname = "/postgres";
  const adminPool = new postgres.Pool({
    connectionString: url.toString(),
  });

  const client = await adminPool.connect();
  try {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      logger.info(`Database "${dbName}" created successfully`);
    }
  } catch (err) {
    logger.error({ err, dbName }, "Error ensuring database exists");
    throw err;
  } finally {
    client.release();
    await adminPool.end();
  }
}

export async function closeDatabase() {
  for (const [dbName, poolInstance] of pools.entries()) {
    await poolInstance.end();
    logger.info({ dbName }, "PostgreSQL pool closed");
  }
  pools.clear();
  dbInstances.clear();
  registryPool = null;
  registryDb = null;
}
