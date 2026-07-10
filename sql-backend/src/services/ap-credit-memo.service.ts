// AP Credit Memo Service: Full CRUD for AP credit memos.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series";
import { buildSqlListFilters } from "@/core/utils/query-helper";
import { resolveCardName } from "@/services/master-data.service";

import {
  calculateOpenQty,
  validateBaseLinks,
  recalculateParentStatuses,
} from "@/services/copy-flow.service";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: apCreditMemos.docNum,
    DocDate: apCreditMemos.docDate,
    CardCode: apCreditMemos.cardCode,
    CardName: apCreditMemos.cardName,
    DocTotal: apCreditMemos.docTotal,
    DocStatus: apCreditMemos.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(apCreditMemos, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(apCreditMemos).where(where);
  const rows = await db
    .select()
    .from(apCreditMemos)
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
  const [h] = await db.select().from(apCreditMemos).where(eq(apCreditMemos.id, id)).limit(1);
  if (!h) throw new AppError("AP Credit memo not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(apCreditMemoLines)
    .where(eq(apCreditMemoLines.docEntry, id))
    .orderBy(asc(apCreditMemoLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 19, h.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...h, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let h;
  if (draftDocEntry && draftDocEntry > 0) {
    [h] = await db.select().from(apCreditMemos).where(eq(apCreditMemos.id, draftDocEntry)).limit(1);
  } else {
    [h] = await db.select().from(apCreditMemos).where(eq(apCreditMemos.docNum, docNum)).limit(1);
  }
  if (!h) throw new AppError("AP Credit memo not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(apCreditMemoLines)
    .where(eq(apCreditMemoLines.docEntry, h.id))
    .orderBy(asc(apCreditMemoLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 19, h.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...h, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: apCreditMemos.docNum })
    .from(apCreditMemos)
    .where(search ? sql`CAST(${apCreditMemos.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(apCreditMemos.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const isDraft = payload.isDraft === true;
    const draftDocEntry = payload.draftDocEntry;

    if (!isDraft) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode);
    }

    let headerId: number;
    let docNum: number;

    if (draftDocEntry && draftDocEntry > 0) {
      const [existing] = await tx
        .select()
        .from(apCreditMemos)
        .where(eq(apCreditMemos.id, draftDocEntry))
        .limit(1);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = payload.docNum;
      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
        0,
      );

      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      await tx
        .update(apCreditMemos)
        .set({
          docNum,
          docDate: payload.docDate,
          docDueDate: payload.docDueDate ?? null,
          cardCode: payload.cardCode,
          cardName,
          docCurrency: payload.docCurrency ?? null,
          docStatus: isDraft ? "D" : "O",
          canceled: "N",
          docTotal: String(lineTotal),
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
          numAtCard: payload.numAtCard ?? null,
        })
        .where(eq(apCreditMemos.id, draftDocEntry));

      await tx.delete(apCreditMemoLines).where(eq(apCreditMemoLines.docEntry, draftDocEntry));
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum;
      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
        0,
      );

      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      const [header] = await tx
        .insert(apCreditMemos)
        .values({
          docNum,
          docDate: payload.docDate,
          docDueDate: payload.docDueDate ?? null,
          cardCode: payload.cardCode,
          cardName,
          docCurrency: payload.docCurrency ?? null,
          docStatus,
          canceled: "N",
          docTotal: String(lineTotal),
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
          numAtCard: payload.numAtCard ?? null,
        })
        .returning();
      headerId = header.id;
    }

    if (payload.lines?.length) {
      await tx.insert(apCreditMemoLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: headerId,
          lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
          itemCode: l.itemCode,
          itemDescription: l.itemDescription ?? null,
          quantity: String(l.quantity),
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
          warehouseCode: l.warehouseCode ?? null,
          uomCode: l.uomCode ?? null,
          lineTotal: String((l.unitPrice ?? 0) * l.quantity),
          baseEntry: l.baseEntry ?? null,
          baseLine: l.baseLine ?? null,
          baseType: l.baseType ?? null,
          baseQuantity: l.baseQuantity != null ? String(l.baseQuantity) : null,
        })),
      );
    }

    if (!isDraft) {
      const parentDocEntries = new Set<number>(
        payload.lines.map((l: any) => l.baseEntry).filter(Boolean),
      );
      await recalculateParentStatuses(tx, parentDocEntries, 18);
    }

    logger.info({ docNum: payload.docNum }, "AP Credit memo created");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(apCreditMemos).where(eq(apCreditMemos.id, id)).limit(1);
    if (!ex) throw new AppError("AP Credit memo not found", 404, "NOT_FOUND");

    const isDraft = payload.isDraft === true || ex.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode ?? ex.cardCode, id, 19);
    }

    const updatedDocStatus =
      payload.isDraft === true ? "D" : ex.docStatus === "D" ? "O" : ex.docStatus;
    const lineTotal = payload.lines
      ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
      : Number(ex.docTotal);

    // Save old parent entries before we modify the lines
    const oldLines = await tx
      .select({ baseEntry: apCreditMemoLines.baseEntry })
      .from(apCreditMemoLines)
      .where(eq(apCreditMemoLines.docEntry, id));
    const oldParentEntries = new Set<number>(oldLines.map((l: any) => l.baseEntry).filter(Boolean));

    await tx
      .update(apCreditMemos)
      .set({
        docDate: payload.docDate,
        docDueDate: payload.docDueDate ?? undefined,
        docCurrency: payload.docCurrency,
        docStatus: updatedDocStatus,
        canceled: "N",
        docTotal: String(lineTotal),
        address: payload.address ?? undefined,
        address2: payload.address2 ?? undefined,
        comments: payload.comments,
        numAtCard: payload.numAtCard ?? undefined,
      })
      .where(eq(apCreditMemos.id, id));

    if (payload.lines) {
      await tx.delete(apCreditMemoLines).where(eq(apCreditMemoLines.docEntry, id));
      await tx.insert(apCreditMemoLines).values(
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
          baseEntry: l.baseEntry ?? null,
          baseLine: l.baseLine ?? null,
          baseType: l.baseType ?? null,
          baseQuantity: l.baseQuantity != null ? String(l.baseQuantity) : null,
        })),
      );

      if (!isDraft) {
        const newParentEntries = new Set<number>(
          payload.lines.map((l: any) => l.baseEntry).filter(Boolean),
        );
        const allParentEntries = new Set<number>([...oldParentEntries, ...newParentEntries]);
        await recalculateParentStatuses(tx, allParentEntries, 18);
      }
    }
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(apCreditMemos).where(eq(apCreditMemos.id, id)).limit(1);
    if (!ex) throw new AppError("AP Credit memo not found", 404, "NOT_FOUND");
    await tx
      .update(apCreditMemos)
      .set({ docStatus: "C", canceled: "Y" })
      .where(eq(apCreditMemos.id, id));

    const lines = await tx
      .select({ baseEntry: apCreditMemoLines.baseEntry })
      .from(apCreditMemoLines)
      .where(eq(apCreditMemoLines.docEntry, id));
    const parentEntries = new Set<number>(lines.map((l: any) => l.baseEntry).filter(Boolean));
    await recalculateParentStatuses(tx, parentEntries, 18);

    return getById(id);
  });
};

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("ap_credit_memos", "ap_credit_memos", 61000);
};

export const apCreditMemoService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
