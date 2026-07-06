// Incoming Payment Service: Full CRUD for incoming payments.

import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { incomingPayments } from "@/db/schema/incoming-payments";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { buildSqlListFilters } from "@/core/utils/query-helper";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: incomingPayments.docNum,
    DocDate: incomingPayments.docDate,
    CardCode: incomingPayments.cardCode,
    CardName: incomingPayments.cardName,
    DocTotal: incomingPayments.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(incomingPayments, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(incomingPayments).where(where);
  const rows = await db
    .select()
    .from(incomingPayments)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);
  return {
    data: rows,
    total: Number(t.total),
    page,
    limit,
    totalPages: Math.ceil(Number(t.total) / limit),
  };
};

export const getById = async (id: number) => {
  const db = getDb();
  const [h] = await db.select().from(incomingPayments).where(eq(incomingPayments.id, id)).limit(1);
  if (!h) throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  return { ...h, lines: [] };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db
    .select()
    .from(incomingPayments)
    .where(eq(incomingPayments.docNum, docNum))
    .limit(1);
  if (!h) throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  return { ...h, lines: [] };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: incomingPayments.docNum })
    .from(incomingPayments)
    .where(search ? sql`CAST(${incomingPayments.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(incomingPayments.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(incomingPayments)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docTotal: payload.docTotal != null ? String(payload.docTotal) : null,
      counterRef: payload.counterRef ?? null,
      paymentMode: payload.paymentMode ?? null,
    })
    .returning();
  logger.info({ docNum: payload.docNum }, "Incoming payment created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(incomingPayments).where(eq(incomingPayments.id, id)).limit(1);
  if (!ex) throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  await db
    .update(incomingPayments)
    .set({
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName,
      counterRef: payload.counterRef ?? undefined,
      paymentMode: payload.paymentMode ?? undefined,
    })
    .where(eq(incomingPayments.id, id));
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(incomingPayments).where(eq(incomingPayments.id, id)).limit(1);
  if (!ex) throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  await db.delete(incomingPayments).where(eq(incomingPayments.id, id));
  logger.info({ id }, "Incoming payment cancelled (deleted)");
};

export const incomingPaymentService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
