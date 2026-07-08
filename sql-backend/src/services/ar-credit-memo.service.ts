// AR Credit Memo Service: Full CRUD for AR credit memos.

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { buildSqlListFilters } from "@/core/utils/query-helper";
import { resolveCardName } from "@/services/master-data.service";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: arCreditMemos.docNum,
    DocDate: arCreditMemos.docDate,
    CardCode: arCreditMemos.cardCode,
    CardName: arCreditMemos.cardName,
    DocTotal: arCreditMemos.docTotal,
    DocStatus: arCreditMemos.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(arCreditMemos, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(arCreditMemos).where(where);
  const rows = await db
    .select()
    .from(arCreditMemos)
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
  const [h] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, id)).limit(1);
  if (!h) throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(arCreditMemoLines)
    .where(eq(arCreditMemoLines.docEntry, id))
    .orderBy(asc(arCreditMemoLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let h;
  if (draftDocEntry && draftDocEntry > 0) {
    [h] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, draftDocEntry)).limit(1);
  } else {
    [h] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.docNum, docNum)).limit(1);
  }
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
  const isDraft = payload.isDraft === true;
  const draftDocEntry = payload.draftDocEntry;

  if (!isDraft && draftDocEntry && draftDocEntry > 0) {
    const [existing] = await db
      .select()
      .from(arCreditMemos)
      .where(eq(arCreditMemos.id, draftDocEntry))
      .limit(1);

    if (!existing) {
      throw new AppError("Draft document not found", 404, "NOT_FOUND");
    }

    const docNum = payload.docNum;
    const lineTotal = payload.lines.reduce(
      (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
      0,
    );

    const cardName = await resolveCardName(payload.cardCode, payload.cardName);

    await db
      .update(arCreditMemos)
      .set({
        docNum,
        docDate: payload.docDate,
        docDueDate: payload.docDueDate ?? null,
        cardCode: payload.cardCode,
        cardName,
        docCurrency: payload.docCurrency ?? null,
        docStatus: "O",
        docTotal: String(lineTotal),
        address: payload.address ?? null,
        address2: payload.address2 ?? null,
        comments: payload.comments ?? null,
        numAtCard: payload.numAtCard ?? null,
      })
      .where(eq(arCreditMemos.id, draftDocEntry));

    await db.delete(arCreditMemoLines).where(eq(arCreditMemoLines.docEntry, draftDocEntry));
    if (payload.lines?.length) {
      await db.insert(arCreditMemoLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: draftDocEntry,
          lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
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

    logger.info({ docNum, id: draftDocEntry }, "Draft converted to real AR Credit memo");
    return getById(draftDocEntry);
  }

  const docStatus = isDraft ? "D" : "O";
  const docNum = payload.docNum;
  const lineTotal = payload.lines.reduce(
    (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
    0,
  );

  const cardName = await resolveCardName(payload.cardCode, payload.cardName);

  const [h] = await db
    .insert(arCreditMemos)
    .values({
      docNum,
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? null,
      cardCode: payload.cardCode,
      cardName,
      docCurrency: payload.docCurrency ?? null,
      docStatus,
      docTotal: String(lineTotal),
      address: payload.address ?? null,
      address2: payload.address2 ?? null,
      comments: payload.comments ?? null,
      numAtCard: payload.numAtCard ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(arCreditMemoLines).values(
      payload.lines.map((l: any, idx: number) => ({
        docEntry: h.id,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
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

  logger.info({ docNum }, "AR Credit memo created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, id)).limit(1);
  if (!ex) throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");

  const updatedDocStatus = payload.isDraft === true ? "D" : ex.docStatus;
  const lineTotal = payload.lines
    ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
    : Number(ex.docTotal);

  await db
    .update(arCreditMemos)
    .set({
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? undefined,
      docCurrency: payload.docCurrency,
      docStatus: updatedDocStatus,
      docTotal: String(lineTotal),
      address: payload.address ?? undefined,
      address2: payload.address2 ?? undefined,
      comments: payload.comments,
      numAtCard: payload.numAtCard ?? undefined,
    })
    .where(eq(arCreditMemos.id, id));

  if (payload.lines) {
    await db.delete(arCreditMemoLines).where(eq(arCreditMemoLines.docEntry, id));
    await db.insert(arCreditMemoLines).values(
      payload.lines.map((l: any, idx: number) => ({
        docEntry: id,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
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

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("ar_credit_memos", "ar_credit_memos", 71000);
};

export const arCreditMemoService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
