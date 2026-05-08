// Sales Order Service: Handles sales order business logic.

import { Like } from "typeorm";

import { getTenantDataSource } from "@/db/config/data-source";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";

export const getSalesOrders = async (
  dbName: string,
  filters: { page?: number; limit?: number; status?: string; search?: string },
) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(SalesOrderSchema);
  const where: Record<string, unknown> = {};
  if (filters.status) {
    where.docStatus = filters.status;
  }
  if (filters.search) {
    where.cardCode = Like(`%${filters.search}%`);
  }

  const [data, total] = await repo.findAndCount({
    order: { docDate: "DESC" },
    skip: ((filters.page || 1) - 1) * (filters.limit || 20),
    take: filters.limit || 20,
    where,
  });
  return { data, limit: filters.limit || 20, page: filters.page || 1, total };
};

export const getSalesOrderDocNums = async (dbName: string, search?: string, limit = 10) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(SalesOrderSchema);
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

export const getSalesOrder = async (dbName: string, id: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(SalesOrderSchema);
  return repo.findOne({ where: { docEntry: Number.parseInt(id) } });
};

export const getSalesOrderByDocNum = async (dbName: string, docNum: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(SalesOrderSchema);
  return repo.findOne({ where: { docNum: Number.parseInt(docNum) } });
};

export const getSalesEmployees = async (dbName: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(SalesEmployeeSchema);
  return repo.find();
};

export const getOpenSalesOrderLines = async (_dbName: string) => ({
  data: [],
  total: 0,
});

export const salesOrderService = {
  getOpenSalesOrderLines,
  getSalesEmployees,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesOrderDocNums,
  getSalesOrders,
};
