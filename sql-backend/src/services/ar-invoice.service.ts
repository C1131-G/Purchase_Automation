// AR Invoice Service: Full CRUD for AR invoices.

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { arInvoices } from "@/db/schema/ar-invoices";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = and(
    filters.cardCode ? eq(arInvoices.cardCode, filters.cardCode) : undefined,
    filters.docStatus ? eq(arInvoices.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${arInvoices.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${arInvoices.docDate} <= ${filters.dateTo}` : undefined,
    filters.search
      ? or(
          sql`CAST(${arInvoices.docNum} AS TEXT) LIKE ${`%${filters.search}%`}`,
          like(arInvoices.cardName, `%${filters.search}%`),
        )
      : undefined,
  );
  const [t] = await db.select({ total: count() }).from(arInvoices).where(where);
  const rows = await db
    .select()
    .from(arInvoices)
    .where(where)
    .orderBy(desc(arInvoices.docNum))
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
  const [h] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!h) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(arInvoiceLines)
    .where(eq(arInvoiceLines.docEntry, id))
    .orderBy(asc(arInvoiceLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db.select().from(arInvoices).where(eq(arInvoices.docNum, docNum)).limit(1);
  if (!h) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(arInvoiceLines)
    .where(eq(arInvoiceLines.docEntry, h.id))
    .orderBy(asc(arInvoiceLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: arInvoices.docNum })
    .from(arInvoices)
    .where(search ? sql`CAST(${arInvoices.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(arInvoices.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(arInvoices)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docStatus: "O",
      numAtCard: payload.numAtCard ?? null,
    })
    .returning();
  if (payload.lines?.length) {
    await db.insert(arInvoiceLines).values(
      payload.lines.map((l: any) => ({
        docEntry: h.id,
        lineNum: l.lineNum,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription ?? null,
        quantity: String(l.quantity),
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        warehouseCode: l.warehouseCode ?? null,
        uomCode: l.uomCode ?? null,
        lineTotal: String((l.unitPrice ?? 0) * l.quantity),
      })),
    );
  }
  logger.info({ docNum: payload.docNum }, "AR Invoice created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  await db
    .update(arInvoices)
    .set({
      docDate: payload.docDate,
      docCurrency: payload.docCurrency,
      numAtCard: payload.numAtCard ?? undefined,
    })
    .where(eq(arInvoices.id, id));
  if (payload.lines) {
    await db.delete(arInvoiceLines).where(eq(arInvoiceLines.docEntry, id));
    await db.insert(arInvoiceLines).values(
      payload.lines.map((l: any) => ({
        docEntry: id,
        lineNum: l.lineNum,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription ?? null,
        quantity: String(l.quantity),
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        warehouseCode: l.warehouseCode ?? null,
        uomCode: l.uomCode ?? null,
        lineTotal: String((l.unitPrice ?? 0) * l.quantity),
      })),
    );
  }
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  await db.update(arInvoices).set({ docStatus: "C" }).where(eq(arInvoices.id, id));
  return getById(id);
};

export const reopen = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  await db.update(arInvoices).set({ docStatus: "O" }).where(eq(arInvoices.id, id));
  return getById(id);
};

export const arInvoiceService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  reopen,
  update,
};
