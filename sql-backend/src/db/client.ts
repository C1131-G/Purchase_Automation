import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

export interface TenantContext {
  db: ReturnType<typeof drizzle>;
  dbName: string;
}

export const dbContext = new AsyncLocalStorage<TenantContext>();

let registryDb: ReturnType<typeof drizzle> | null = null;
let registryPool: pg.Pool | null = null;

const pools = new Map<string, pg.Pool>();
const dbInstances = new Map<string, ReturnType<typeof drizzle>>();

function getConnectionStringForDb(dbName: string): string {
  const url = new URL(config.postgres.databaseUrl);
  url.pathname = `/${dbName}`;
  return url.toString();
}

export async function initializeDatabase() {
  registryPool = new pg.Pool({
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

  return registryDb;
}

export function getDbForTenant(dbName: string) {
  let tenantPool = pools.get(dbName);
  let tenantDb = dbInstances.get(dbName);

  if (!tenantPool) {
    const connectionString = getConnectionStringForDb(dbName);
    logger.info({ dbName }, "Initializing connection pool for tenant database");
    tenantPool = new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pools.set(dbName, tenantPool);
    tenantDb = drizzle(tenantPool);
    dbInstances.set(dbName, tenantDb);
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
  const adminPool = new pg.Pool({
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
