// Tenant DAL Helper: Provides tenant-aware repository access for SQL backend.

import type { EntitySchema } from "typeorm";

import { getTenantDataSource } from "@/db/config/data-source";

export const getTenantRepository = async <T>(dbName: string, schema: EntitySchema<T>) => {
  const ds = await getTenantDataSource(dbName);
  return ds.getRepository(schema);
};

export const tenantDalHelper = {
  getTenantRepository,
};
