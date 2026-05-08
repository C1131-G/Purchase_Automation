// Outgoing Payment Service: Handles outgoing payment business logic.

import { Like } from "typeorm";

import { getTenantDataSource } from "@/db/config/data-source";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";

export const getPayments = async (
  dbName: string,
  filters: { page?: number; limit?: number; status?: string; search?: string },
) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(OutgoingPaymentSchema);
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

export const getPaymentDocNums = async (dbName: string, search?: string, limit = 10) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(OutgoingPaymentSchema);
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

export const getPayment = async (dbName: string, id: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(OutgoingPaymentSchema);
  return repo.findOne({ where: { docEntry: Number.parseInt(id) } });
};

export const getPaymentByDocNum = async (dbName: string, docNum: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(OutgoingPaymentSchema);
  return repo.findOne({ where: { docNum: Number.parseInt(docNum) } });
};

export const outgoingPaymentService = {
  getPayment,
  getPaymentByDocNum,
  getPaymentDocNums,
  getPayments,
};
