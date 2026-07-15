import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { organizations } from "@/db/schema/organizations";
import { userDbAccess } from "@/db/schema/user-db-access";
import { users } from "@/db/schema/users";

export async function seedRegistry() {
  logger.info("Connecting to the registry database...");
  const registryPool = new pg.Pool({
    connectionString: config.postgres.databaseUrl,
  });
  const registryDb = drizzle(registryPool);

  logger.info("Cleaning registry tables...");
  await registryDb.delete(userDbAccess);
  await registryDb.delete(organizations);
  await registryDb.delete(users);

  logger.info("Seeding organizations...");
  const seededOrgs = await registryDb
    .insert(organizations)
    .values([
      {
        companyName: "CIBI ERP Corporate HQ",
        dbName: "CIBI_ERP_DB",
        dbServer: "localhost",
        isActive: "Y",
      },
      {
        companyName: "VISHNU ERP Corporate HQ",
        dbName: "VISHNU_ERP_DB",
        dbServer: "localhost",
        isActive: "Y",
      },
      {
        companyName: "VISHNU ERP Corporate HQ",
        dbName: "VISHNU_ERP_BRANCH_DB",
        dbServer: "localhost",
        isActive: "Y",
      },
    ])
    .returning();

  logger.info({ count: seededOrgs.length }, "Seeded organizations in registry");

  logger.info("Seeding users in registry...");
  const seededUsers = await registryDb
    .insert(users)
    .values([
      {
        companyName: "CIBI ERP Corporate HQ",
        password: "admin@123",
        username: "Cibi",
      },
      {
        companyName: "CIBI ERP Corporate HQ",
        password: "admin@123",
        username: "Chandru",
      },
      {
        companyName: "VISHNU ERP Corporate HQ",
        password: "admin123",
        username: "Vishnu",
      },
      {
        companyName: "VISHNU ERP Corporate HQ",
        password: "employee123",
        username: "Veera",
      },
    ])
    .returning();

  logger.info({ count: seededUsers.length }, "Seeded users in registry");

  const userMap = new Map(seededUsers.map((u) => [u.username, u.id]));

  logger.info("Seeding user DB access records in registry...");
  await registryDb.insert(userDbAccess).values([
    { dbName: "CIBI_ERP_DB", userId: userMap.get("Cibi")! },
    { dbName: "CIBI_ERP_DB", userId: userMap.get("Chandru")! },

    { dbName: "VISHNU_ERP_DB", userId: userMap.get("Vishnu")! },
    { dbName: "VISHNU_ERP_BRANCH_DB", userId: userMap.get("Vishnu")! },

    { dbName: "VISHNU_ERP_BRANCH_DB", userId: userMap.get("Veera")! },
  ]);

  logger.info("Registry database seeding completed.");
  await registryPool.end();

  return seededUsers;
}
