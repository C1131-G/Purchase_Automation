import { Like } from "typeorm";

import { getTenantDataSource } from "@/db/config/data-source";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

export const getBusinessPartners = async (
  dbName: string,
  filters: { page?: number; limit?: number; search?: string },
) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(BusinessPartnerSchema);
  const where = filters.search ? { cardCode: Like(`%${filters.search}%`) } : {};

  const [data, total] = await repo.findAndCount({
    skip: ((filters.page || 1) - 1) * (filters.limit || 20),
    take: filters.limit || 20,
    where,
  });

  return { data, total };
};

export const getItems = async (
  dbName: string,
  filters: { page?: number; limit?: number; search?: string },
) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(ItemSchema);
  const where = filters.search ? { itemCode: Like(`%${filters.search}%`) } : {};

  const [data, total] = await repo.findAndCount({
    skip: ((filters.page || 1) - 1) * (filters.limit || 20),
    take: filters.limit || 20,
    where,
  });

  return { data, total };
};

export const getWarehouses = async (dbName: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(WarehouseSchema);
  return repo.find();
};

export const masterDataService = {
  getBusinessPartners,
  getItems,
  getWarehouses,
};
