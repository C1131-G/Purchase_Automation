// Goods Issue Service: CRUD for inventory goods issues.

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { attachments } from "@/db/schema/attachments";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";

import { buildSqlListFilters } from "@/core/utils/query-helper";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: goodsIssues.docNum,
    DocDate: goodsIssues.docDate,
    DocTotal: goodsIssues.docTotal,
    DocStatus: goodsIssues.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(goodsIssues, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(goodsIssues).where(where);
  const rows = await db
    .select()
    .from(goodsIssues)
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
  const [h] = await db.select().from(goodsIssues).where(eq(goodsIssues.id, id)).limit(1);
  if (!h) throw new AppError("Goods issue not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(goodsIssueLines)
    .where(eq(goodsIssueLines.docEntry, id))
    .orderBy(asc(goodsIssueLines.lineNum));

  const attachmentsList = h.attachmentEntry
    ? await db.select().from(attachments).where(eq(attachments.absEntry, h.attachmentEntry))
    : [];

  return {
    ...h,
    lines: lines.map((l) => ({
      ...l,
      binAllocations: l.binAllocations || [],
      inventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
      InventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
      U_INVADJMTRES: l.inventoryAdjustmentReason || "",
    })),
    attachments: attachmentsList,
  };
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

  const attachmentsList = h.attachmentEntry
    ? await db.select().from(attachments).where(eq(attachments.absEntry, h.attachmentEntry))
    : [];

  return {
    ...h,
    lines: lines.map((l) => ({
      ...l,
      binAllocations: l.binAllocations || [],
      inventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
      InventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
      U_INVADJMTRES: l.inventoryAdjustmentReason || "",
    })),
    attachments: attachmentsList,
  };
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

  let attachmentEntry: number | null = null;
  if (payload.attachments && Array.isArray(payload.attachments) && payload.attachments.length > 0) {
    attachmentEntry = Date.now() + Math.floor(Math.random() * 10000);
    await db.insert(attachments).values(
      payload.attachments.map((att: any) => ({
        absEntry: attachmentEntry,
        fileName: att.fileName,
        fileExtension: att.fileExtension,
        sourcePath: att.sourcePath,
        freeText: att.freeText ?? null,
        attachmentDate: att.attachmentDate
          ? att.attachmentDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
      })),
    );
  }

  const [h] = await db
    .insert(goodsIssues)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      taxDate: payload.taxDate ?? null,
      docStatus: "O",
      comments: payload.comments ?? null,
      jrnlMemo: payload.jrnlMemo ?? null,
      docCurrency: payload.docCurrency ?? null,
      ref2: payload.ref2 ?? null,
      series: payload.series ?? null,
      priceList: payload.priceList ?? null,
      attachmentEntry: attachmentEntry,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(goodsIssueLines).values(
      payload.lines.map((l: any, idx: number) => ({
        docEntry: h.id,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
        itemCode: l.itemCode,
        dscription: l.dscription ?? null,
        quantity: String(l.quantity),
        price: l.price != null ? String(l.price) : null,
        warehouseCode: l.warehouseCode ?? null,
        acctCode: l.acctCode ?? null,
        ocrCode: l.ocrCode ?? l.costingCode ?? null,
        uomCode: l.uomCode ?? null,
        unitMsr: l.unitMsr ?? null,
        inventoryAdjustmentReason: l.inventoryAdjustmentReason ?? null,
        binAllocations: l.documentLinesBinAllocations ?? null,
      })),
    );
  }

  logger.info({ docNum: payload.docNum }, "Goods issue created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(goodsIssues).where(eq(goodsIssues.id, id)).limit(1);
  if (!ex) throw new AppError("Goods issue not found", 404, "NOT_FOUND");

  let attachmentEntry = ex.attachmentEntry;
  if (payload.attachments !== undefined) {
    if (
      payload.attachments &&
      Array.isArray(payload.attachments) &&
      payload.attachments.length > 0
    ) {
      if (!attachmentEntry) {
        attachmentEntry = Date.now() + Math.floor(Math.random() * 10000);
      } else {
        await db.delete(attachments).where(eq(attachments.absEntry, attachmentEntry));
      }
      await db.insert(attachments).values(
        payload.attachments.map((att: any) => ({
          absEntry: attachmentEntry,
          fileName: att.fileName,
          fileExtension: att.fileExtension,
          sourcePath: att.sourcePath,
          freeText: att.freeText ?? null,
          attachmentDate: att.attachmentDate
            ? att.attachmentDate.split("T")[0]
            : new Date().toISOString().split("T")[0],
        })),
      );
    } else {
      if (attachmentEntry) {
        await db.delete(attachments).where(eq(attachments.absEntry, attachmentEntry));
        attachmentEntry = null;
      }
    }
  }

  await db
    .update(goodsIssues)
    .set({
      comments: payload.comments !== undefined ? payload.comments : ex.comments,
      jrnlMemo: payload.jrnlMemo !== undefined ? payload.jrnlMemo : ex.jrnlMemo,
      ref2: payload.ref2 !== undefined ? payload.ref2 : ex.ref2,
      attachmentEntry: attachmentEntry,
    })
    .where(eq(goodsIssues.id, id));

  return getById(id);
};

export const previewNextDocNum = async () => {
  const { previewNextDocNum: previewNextDocNumHelper } = await import("@/core/utils/series");
  return previewNextDocNumHelper("goods_issues", "goods_issues", 81000);
};

export const goodsIssueService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
