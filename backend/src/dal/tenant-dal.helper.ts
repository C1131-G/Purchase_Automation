// Tenant DAL Helper: Provides centralized access to tenant-specific TypeORM repositories and raw query execution.

import type { EntitySchema, ObjectLiteral, Repository } from "typeorm";

import { getTenantDataSource } from "@/db/config/tenant-data-source";

// Obtains a TypeORM repository instance for a specific tenant's database and a given entity.
// This abstract away the multi-tenant data source logic from the rest of the DAL.
export const getTenantRepository = async <T extends ObjectLiteral>(
  dbName: string,
  EntityClass: EntitySchema<T> | string,
): Promise<Repository<T>> => {
  // getTenantDataSource handles connection pooling and lazy-initialization for each tenant.
  const dataSource = await getTenantDataSource(dbName);
  return dataSource.getRepository(EntityClass);
};

// Directly executes a raw SQL query on the specified tenant's database.
export const executeTenantQuery = async (
  dbName: string,
  query: string,
  parameters: unknown[] = [],
): Promise<unknown> => {
  const dataSource = await getTenantDataSource(dbName);
  return dataSource.query(query, parameters);
};
