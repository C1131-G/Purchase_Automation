import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import postgres from "pg";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { ensureDatabaseExists } from "@/db/client";

async function runMigrations() {
  logger.info("Starting registry database migrations...");

  const registryPool = new postgres.Pool({
    connectionString: config.postgres.databaseUrl,
  });

  const registryDb = drizzle(registryPool);

  // 1. Run migrations on the registry DB
  await migrate(registryDb, {
    migrationsFolder: "./src/db/migrations",
  });
  logger.info("Registry database migrations completed successfully");

  // 2. Query organizations list from registry database to migrate all tenant DBs
  let orgs: { db_name: string }[] = [];
  try {
    const res = await registryPool.query("SELECT db_name FROM organizations WHERE is_active = 'Y'");
    orgs = res.rows;
  } catch (err) {
    logger.warn({ err }, "Could not query organizations, skipping dynamic tenant migrations");
  }

  await registryPool.end();

  // 3. Run migrations on each active tenant database
  for (const org of orgs) {
    const tenantDbName = org.db_name;
    logger.info({ tenantDbName }, "Ensuring tenant database exists...");
    await ensureDatabaseExists(tenantDbName, config.postgres.databaseUrl);

    const url = new URL(config.postgres.databaseUrl);
    url.pathname = `/${tenantDbName}`;

    const tenantPool = new postgres.Pool({
      connectionString: url.toString(),
    });

    const tenantDb = drizzle(tenantPool);

    logger.info({ tenantDbName }, "Running migrations on tenant database...");
    await migrate(tenantDb, {
      migrationsFolder: "./src/db/migrations",
    });

    logger.info({ tenantDbName }, "Migrations completed successfully");
    await tenantPool.end();
  }
}

runMigrations().catch((err) => {
  logger.fatal({ err }, "Migration failed");
  process.exit(1);
});
