import { Like } from "typeorm";

import { getTenantDataSource } from "@/db/config/data-source";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";

export const getPurchaseOrders = async (
  dbName: string,
  filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  },
) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(PurchaseOrderSchema);

  const page = filters.page || 1;
  const limit = filters.limit || 20;

  const where: Record<string, unknown> = {};
  if (filters.status) {
    where.docStatus = filters.status;
  }
  if (filters.search) {
    where.cardCode = Like(`%${filters.search}%`);
  }

  const [data, total] = await repo.findAndCount({
    order: { docDate: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
    where,
  });

  return { data, limit, page, total };
};

export const getPurchaseOrderDocNums = async (dbName: string, search?: string, limit = 10) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(PurchaseOrderSchema);

  const where = search ? { docNum: Like(`%${search}%`) } : {};

  const data = await repo.find({
    cache: true,
    order: { docNum: "DESC" },
    select: ["docNum", "docEntry"],
    take: limit,
    where,
  });

  return { data };
};

export const getPurchaseOrder = async (dbName: string, id: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(PurchaseOrderSchema);

  return repo.findOne({ where: { docEntry: Number.parseInt(id) } });
};

export const purchaseOrderService = {
  getPurchaseOrder,
  getPurchaseOrderDocNums,
  getPurchaseOrders,
};
