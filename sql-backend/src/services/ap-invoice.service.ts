// AP Invoice Service: Full CRUD for AP invoices.

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { apInvoices } from "@/db/schema/ap-invoices";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = and(
    filters.cardCode ? eq(apInvoices.cardCode, filters.cardCode) : undefined,
    filters.docStatus ? eq(apInvoices.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${apInvoices.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${apInvoices.docDate} <= ${filters.dateTo}` : undefined,
    filters.search
      ? or(
          sql`CAST(${apInvoices.docNum} AS TEXT) LIKE ${`%${filters.search}%`}`,
          like(apInvoices.cardName, `%${filters.search}%`),
        )
      : undefined,
  );
  const [t] = await db.select({ total: count() }).from(apInvoices).where(where);
  const rows = await db
    .select()
    .from(apInvoices)
    .where(where)
    .orderBy(desc(apInvoices.docNum))
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
  const [h] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
  if (!h) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(apInvoiceLines)
    .where(eq(apInvoiceLines.docEntry, id))
    .orderBy(asc(apInvoiceLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db.select().from(apInvoices).where(eq(apInvoices.docNum, docNum)).limit(1);
  if (!h) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(apInvoiceLines)
    .where(eq(apInvoiceLines.docEntry, h.id))
    .orderBy(asc(apInvoiceLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: apInvoices.docNum })
    .from(apInvoices)
    .where(search ? sql`CAST(${apInvoices.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(apInvoices.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(apInvoices)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docStatus: "O",
    })
    .returning();
  if (payload.lines?.length) {
    await db.insert(apInvoiceLines).values(
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
  logger.info({ docNum: payload.docNum }, "AP Invoice created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  await db
    .update(apInvoices)
    .set({
      docDate: payload.docDate,
      docCurrency: payload.docCurrency,
    })
    .where(eq(apInvoices.id, id));
  if (payload.lines) {
    await db.delete(apInvoiceLines).where(eq(apInvoiceLines.docEntry, id));
    await db.insert(apInvoiceLines).values(
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
  const [ex] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  await db.update(apInvoices).set({ docStatus: "C" }).where(eq(apInvoices.id, id));
  return getById(id);
};

export const reopen = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  await db.update(apInvoices).set({ docStatus: "O" }).where(eq(apInvoices.id, id));
  return getById(id);
};

export const apInvoiceService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  reopen,
  update,
};
