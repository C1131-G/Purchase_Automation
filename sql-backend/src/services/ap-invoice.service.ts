// AP Invoice Service: Handles A/P invoice business logic for SQL backend.

import { Like } from "typeorm";

import { getTenantDataSource } from "@/db/config/data-source";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";

export const getInvoices = async (
  dbName: string,
  filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  },
) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(APInvoiceSchema);

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

export const getInvoiceDocNums = async (dbName: string, search?: string, limit = 10) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(APInvoiceSchema);

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

export const getInvoice = async (dbName: string, id: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(APInvoiceSchema);
  return repo.findOne({ where: { docEntry: Number.parseInt(id) } });
};

export const apInvoiceService = {
  getInvoice,
  getInvoiceDocNums,
  getInvoices,
};
