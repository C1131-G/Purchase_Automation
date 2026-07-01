// Goods Issue Service: CRUD for inventory goods issues.

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = and(
    filters.docStatus ? eq(goodsIssues.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${goodsIssues.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${goodsIssues.docDate} <= ${filters.dateTo}` : undefined,
  );
  const [t] = await db.select({ total: count() }).from(goodsIssues).where(where);
  const rows = await db
    .select()
    .from(goodsIssues)
    .where(where)
    .orderBy(desc(goodsIssues.docNum))
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
  const [h] = await db.select().from(goodsIssues).where(eq(goodsIssues.id, id)).limit(1);
  if (!h) throw new AppError("Goods issue not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(goodsIssueLines)
    .where(eq(goodsIssueLines.docEntry, id))
    .orderBy(asc(goodsIssueLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db.select().from(goodsIssues).where(eq(goodsIssues.docNum, docNum)).limit(1);
  if (!h) throw new AppError("Goods issue not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(goodsIssueLines)
    .where(eq(goodsIssueLines.docEntry, h.id))
    .orderBy(asc(goodsIssueLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100000);
  const rows = await db
    .select({ docNum: goodsIssues.docNum })
    .from(goodsIssues)
    .where(search ? sql`CAST(${goodsIssues.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(safeLimit)
    .orderBy(desc(goodsIssues.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(goodsIssues)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      docStatus: "O",
      comments: payload.comments ?? null,
      docCurrency: payload.docCurrency ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(goodsIssueLines).values(
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

  logger.info({ docNum: payload.docNum }, "Goods issue created");
  return getById(h.id);
};

export const goodsIssueService = { create, getByDocNum, getById, getDocNums, getList };
