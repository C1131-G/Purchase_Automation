// Outgoing Payment Service: Full CRUD for outgoing payments.

import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { outgoingPayments } from "@/db/schema/outgoing-payments";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = and(
    filters.cardCode ? eq(outgoingPayments.cardCode, filters.cardCode) : undefined,
    filters.dateFrom ? sql`${outgoingPayments.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${outgoingPayments.docDate} <= ${filters.dateTo}` : undefined,
    filters.search
      ? or(
          sql`CAST(${outgoingPayments.docNum} AS TEXT) LIKE ${`%${filters.search}%`}`,
          like(outgoingPayments.cardName, `%${filters.search}%`),
        )
      : undefined,
  );
  const [t] = await db.select({ total: count() }).from(outgoingPayments).where(where);
  const rows = await db
    .select()
    .from(outgoingPayments)
    .where(where)
    .orderBy(desc(outgoingPayments.docNum))
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
  const [h] = await db.select().from(outgoingPayments).where(eq(outgoingPayments.id, id)).limit(1);
  if (!h) throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  return { ...h, lines: [] };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db
    .select()
    .from(outgoingPayments)
    .where(eq(outgoingPayments.docNum, docNum))
    .limit(1);
  if (!h) throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  return { ...h, lines: [] };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: outgoingPayments.docNum })
    .from(outgoingPayments)
    .where(search ? sql`CAST(${outgoingPayments.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(outgoingPayments.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(outgoingPayments)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docTotal: payload.docTotal != null ? String(payload.docTotal) : null,
      paymentMode: payload.paymentMode ?? null,
    })
    .returning();
  logger.info({ docNum: payload.docNum }, "Outgoing payment created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(outgoingPayments).where(eq(outgoingPayments.id, id)).limit(1);
  if (!ex) throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  await db
    .update(outgoingPayments)
    .set({ docDate: payload.docDate })
    .where(eq(outgoingPayments.id, id));
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(outgoingPayments).where(eq(outgoingPayments.id, id)).limit(1);
  if (!ex) throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  await db.delete(outgoingPayments).where(eq(outgoingPayments.id, id));
  logger.info({ id }, "Outgoing payment cancelled (deleted)");
};

export const outgoingPaymentService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
