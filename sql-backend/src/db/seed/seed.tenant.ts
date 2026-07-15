import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { seedTenantItems } from "./seed.tenant-items";
import { seedTenantPartners } from "./seed.tenant-partners";
import { seedTenantReference } from "./seed.tenant-reference";

export async function seedTenantData(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { dbName: string; prefix: string; seed: number },
  seedCurrency: string,
  seededUsers: any[],
) {
  await seedTenantReference(db, tenant, seedCurrency, seededUsers);
  const partners = await seedTenantPartners(db, tenant);
  const items = await seedTenantItems(db, tenant);

  return {
    ...partners,
    items,
  };
}
