// AR Credit Memo Service: Full CRUD for AR credit memos.

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = and(
    filters.cardCode ? eq(arCreditMemos.cardCode, filters.cardCode) : undefined,
    filters.docStatus ? eq(arCreditMemos.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${arCreditMemos.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${arCreditMemos.docDate} <= ${filters.dateTo}` : undefined,
    filters.search
      ? or(
          sql`CAST(${arCreditMemos.docNum} AS TEXT) LIKE ${`%${filters.search}%`}`,
          like(arCreditMemos.cardName, `%${filters.search}%`),
        )
      : undefined,
  );
  const [t] = await db.select({ total: count() }).from(arCreditMemos).where(where);
  const rows = await db
    .select()
    .from(arCreditMemos)
    .where(where)
    .orderBy(desc(arCreditMemos.docNum))
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
  const [h] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, id)).limit(1);
  if (!h) throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(arCreditMemoLines)
    .where(eq(arCreditMemoLines.docEntry, id))
    .orderBy(asc(arCreditMemoLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db
    .select()
    .from(arCreditMemos)
    .where(eq(arCreditMemos.docNum, docNum))
    .limit(1);
  if (!h) throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(arCreditMemoLines)
    .where(eq(arCreditMemoLines.docEntry, h.id))
    .orderBy(asc(arCreditMemoLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: arCreditMemos.docNum })
    .from(arCreditMemos)
    .where(search ? sql`CAST(${arCreditMemos.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(arCreditMemos.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(arCreditMemos)
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
    await db.insert(arCreditMemoLines).values(
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
  logger.info({ docNum: payload.docNum }, "AR Credit memo created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, id)).limit(1);
  if (!ex) throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
  await db
    .update(arCreditMemos)
    .set({
      docDate: payload.docDate,
      docCurrency: payload.docCurrency,
    })
    .where(eq(arCreditMemos.id, id));
  if (payload.lines) {
    await db.delete(arCreditMemoLines).where(eq(arCreditMemoLines.docEntry, id));
    await db.insert(arCreditMemoLines).values(
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
  const [ex] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, id)).limit(1);
  if (!ex) throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
  await db.update(arCreditMemos).set({ docStatus: "C" }).where(eq(arCreditMemos.id, id));
  return getById(id);
};

export const arCreditMemoService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
