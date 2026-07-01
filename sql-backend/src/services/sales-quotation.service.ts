// Sales Quotation Service: Full CRUD for sales quotations.

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = and(
    filters.cardCode ? eq(salesQuotations.cardCode, filters.cardCode) : undefined,
    filters.docStatus ? eq(salesQuotations.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${salesQuotations.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${salesQuotations.docDate} <= ${filters.dateTo}` : undefined,
    filters.search
      ? or(
          sql`CAST(${salesQuotations.docNum} AS TEXT) LIKE ${`%${filters.search}%`}`,
          like(salesQuotations.cardName, `%${filters.search}%`),
        )
      : undefined,
  );
  const [t] = await db.select({ total: count() }).from(salesQuotations).where(where);
  const rows = await db
    .select()
    .from(salesQuotations)
    .where(where)
    .orderBy(desc(salesQuotations.docNum))
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
  const [h] = await db.select().from(salesQuotations).where(eq(salesQuotations.id, id)).limit(1);
  if (!h) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(salesQuotationLines)
    .where(eq(salesQuotationLines.docEntry, id))
    .orderBy(asc(salesQuotationLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db
    .select()
    .from(salesQuotations)
    .where(eq(salesQuotations.docNum, docNum))
    .limit(1);
  if (!h) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(salesQuotationLines)
    .where(eq(salesQuotationLines.docEntry, h.id))
    .orderBy(asc(salesQuotationLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: salesQuotations.docNum })
    .from(salesQuotations)
    .where(search ? sql`CAST(${salesQuotations.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(salesQuotations.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(salesQuotations)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docStatus: "O",
      comments: payload.comments ?? null,
      salesPersonCode: payload.salesPersonCode ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(salesQuotationLines).values(
      payload.lines.map((l: any) => ({
        docEntry: h.id,
        lineNum: l.lineNum,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription ?? null,
        quantity: String(l.quantity),
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        discountPercent: l.discountPercent != null ? String(l.discountPercent) : null,
        vatGroup: l.vatGroup ?? null,
        vatPercent: l.vatPercent != null ? String(l.vatPercent) : null,
        warehouseCode: l.warehouseCode ?? null,
        uomCode: l.uomCode ?? null,
        lineTotal: String((l.unitPrice ?? 0) * l.quantity),
        openQty: String(l.quantity),
      })),
    );
  }

  logger.info({ docNum: payload.docNum }, "Sales quotation created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(salesQuotations).where(eq(salesQuotations.id, id)).limit(1);
  if (!ex) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  await db
    .update(salesQuotations)
    .set({
      docDate: payload.docDate,
      comments: payload.comments,
      docCurrency: payload.docCurrency,
    })
    .where(eq(salesQuotations.id, id));
  if (payload.lines) {
    await db.delete(salesQuotationLines).where(eq(salesQuotationLines.docEntry, id));
    await db.insert(salesQuotationLines).values(
      payload.lines.map((l: any) => ({
        docEntry: id,
        lineNum: l.lineNum,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription ?? null,
        quantity: String(l.quantity),
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        discountPercent: l.discountPercent != null ? String(l.discountPercent) : null,
        vatGroup: l.vatGroup ?? null,
        warehouseCode: l.warehouseCode ?? null,
        uomCode: l.uomCode ?? null,
        lineTotal: String((l.unitPrice ?? 0) * l.quantity),
        openQty: String(l.quantity),
      })),
    );
  }
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(salesQuotations).where(eq(salesQuotations.id, id)).limit(1);
  if (!ex) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  await db.update(salesQuotations).set({ docStatus: "C" }).where(eq(salesQuotations.id, id));
  return getById(id);
};

export const salesQuotationService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
