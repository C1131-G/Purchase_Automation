// Goods Receipt Service: CRUD for inventory goods receipts.

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { goodsReceiptLines } from "@/db/schema/goods-receipt-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series";

import { buildSqlListFilters } from "@/core/utils/query-helper";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: goodsReceipts.docNum,
    DocDate: goodsReceipts.docDate,
    DocTotal: goodsReceipts.docTotal,
    DocStatus: goodsReceipts.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(goodsReceipts, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(goodsReceipts).where(where);
  const rows = await db
    .select()
    .from(goodsReceipts)
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
  const [h] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id)).limit(1);
  if (!h) throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(goodsReceiptLines)
    .where(eq(goodsReceiptLines.docEntry, id))
    .orderBy(asc(goodsReceiptLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db
    .select()
    .from(goodsReceipts)
    .where(eq(goodsReceipts.docNum, docNum))
    .limit(1);
  if (!h) throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(goodsReceiptLines)
    .where(eq(goodsReceiptLines.docEntry, h.id))
    .orderBy(asc(goodsReceiptLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100000);
  const rows = await db
    .select({ docNum: goodsReceipts.docNum })
    .from(goodsReceipts)
    .where(search ? sql`CAST(${goodsReceipts.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(safeLimit)
    .orderBy(desc(goodsReceipts.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(goodsReceipts)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      docStatus: "O",
      comments: payload.comments ?? null,
      jrnlMemo: payload.jrnlMemo ?? null,
      docCurrency: payload.docCurrency ?? null,
      ref2: payload.ref2 ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(goodsReceiptLines).values(
      payload.lines.map((l: any) => ({
        docEntry: h.id,
        lineNum: l.lineNum,
        itemCode: l.itemCode,
        dscription: l.dscription ?? null,
        quantity: String(l.quantity),
        price: l.price != null ? String(l.price) : null,
        warehouseCode: l.warehouseCode ?? null,
        acctCode: l.acctCode ?? null,
      })),
    );
  }

  logger.info({ docNum: payload.docNum }, "Goods receipt created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id)).limit(1);
  if (!ex) throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  await db
    .update(goodsReceipts)
    .set({
      comments: payload.comments,
      jrnlMemo: payload.jrnlMemo,
    })
    .where(eq(goodsReceipts.id, id));
  return getById(id);
};

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("goods_receipts", "goods_receipts", 80000);
};

export const goodsReceiptService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
