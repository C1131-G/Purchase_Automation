// AR Invoice Service: Full CRUD for AR invoices.

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { arInvoices } from "@/db/schema/ar-invoices";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
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
    DocNum: arInvoices.docNum,
    DocDate: arInvoices.docDate,
    CardCode: arInvoices.cardCode,
    CardName: arInvoices.cardName,
    DocTotal: arInvoices.docTotal,
    DocStatus: arInvoices.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(arInvoices, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(arInvoices).where(where);
  const rows = await db
    .select()
    .from(arInvoices)
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
  const [h] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!h) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(arInvoiceLines)
    .where(eq(arInvoiceLines.docEntry, id))
    .orderBy(asc(arInvoiceLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 13, h.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...h, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let h;
  if (draftDocEntry && draftDocEntry > 0) {
    [h] = await db.select().from(arInvoices).where(eq(arInvoices.id, draftDocEntry)).limit(1);
  } else {
    [h] = await db.select().from(arInvoices).where(eq(arInvoices.docNum, docNum)).limit(1);
  }
  if (!h) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(arInvoiceLines)
    .where(eq(arInvoiceLines.docEntry, h.id))
    .orderBy(asc(arInvoiceLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 13, h.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...h, lines: linesWithQty };
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
  return await db.transaction(async (tx) => {
    const isDraft = payload.isDraft === true;
    const draftDocEntry = payload.draftDocEntry;

    if (!isDraft && payload.lines?.length) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode);
    }

    let headerId: number;
    let docNum: number;

    if (draftDocEntry && draftDocEntry > 0) {
      const [existing] = await tx
        .select()
        .from(arInvoices)
        .where(eq(arInvoices.id, draftDocEntry))
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
        .update(arInvoices)
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
          numAtCard: payload.numAtCard ?? null,
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
        })
        .where(eq(arInvoices.id, draftDocEntry));

      await tx.delete(arInvoiceLines).where(eq(arInvoiceLines.docEntry, draftDocEntry));
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum;
      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
        0,
      );

      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      const [header] = await tx
        .insert(arInvoices)
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
          numAtCard: payload.numAtCard ?? null,
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
        })
        .returning();
      headerId = header.id;
    }

    const parentSqIds = new Set<number>();
    const parentSoIds = new Set<number>();

    if (payload.lines?.length) {
      await tx.insert(arInvoiceLines).values(
        payload.lines.map((l: any, idx: number) => {
          const baseType = Number(l.baseType);
          const baseEntry = Number(l.baseEntry);
          if (baseEntry) {
            if (baseType === 23) parentSqIds.add(baseEntry);
            else if (baseType === 17) parentSoIds.add(baseEntry);
          }

          return {
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
          };
        }),
      );
    }

    if (!isDraft) {
      if (parentSqIds.size > 0) await recalculateParentStatuses(tx, parentSqIds, 23);
      if (parentSoIds.size > 0) await recalculateParentStatuses(tx, parentSoIds, 17);
    }

    logger.info({ docNum: payload.docNum }, "AR Invoice created");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
    if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");

    const isDraft = payload.isDraft === true;
    if (!isDraft && payload.lines?.length) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode || ex.cardCode, id, 13);
    }

    // Capture old base links to recalculate
    const oldLines = await tx
      .select({ baseEntry: arInvoiceLines.baseEntry, baseType: arInvoiceLines.baseType })
      .from(arInvoiceLines)
      .where(eq(arInvoiceLines.docEntry, id));
    const parentSqIds = new Set<number>();
    const parentSoIds = new Set<number>();
    for (const ol of oldLines) {
      if (ol.baseEntry) {
        if (ol.baseType === 23) parentSqIds.add(ol.baseEntry);
        else if (ol.baseType === 17) parentSoIds.add(ol.baseEntry);
      }
    }

    const updatedDocStatus = isDraft ? "D" : ex.docStatus === "D" ? "O" : ex.docStatus;
    const lineTotal = payload.lines
      ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
      : Number(ex.docTotal);

    await tx
      .update(arInvoices)
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
      .where(eq(arInvoices.id, id));

    if (payload.lines) {
      await tx.delete(arInvoiceLines).where(eq(arInvoiceLines.docEntry, id));
      await tx.insert(arInvoiceLines).values(
        payload.lines.map((l: any, idx: number) => {
          const baseType = Number(l.baseType);
          const baseEntry = Number(l.baseEntry);
          if (baseEntry) {
            if (baseType === 23) parentSqIds.add(baseEntry);
            else if (baseType === 17) parentSoIds.add(baseEntry);
          }

          return {
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
          };
        }),
      );
    }

    if (!isDraft) {
      if (parentSqIds.size > 0) await recalculateParentStatuses(tx, parentSqIds, 23);
      if (parentSoIds.size > 0) await recalculateParentStatuses(tx, parentSoIds, 17);
    }
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
    if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
    await tx.update(arInvoices).set({ docStatus: "C", canceled: "Y" }).where(eq(arInvoices.id, id));

    const lines = await tx
      .select({ baseEntry: arInvoiceLines.baseEntry, baseType: arInvoiceLines.baseType })
      .from(arInvoiceLines)
      .where(eq(arInvoiceLines.docEntry, id));

    const parentSqIds = new Set<number>();
    const parentSoIds = new Set<number>();
    for (const l of lines) {
      if (l.baseEntry) {
        if (l.baseType === 23) parentSqIds.add(l.baseEntry);
        else if (l.baseType === 17) parentSoIds.add(l.baseEntry);
      }
    }

    if (parentSqIds.size > 0) await recalculateParentStatuses(tx, parentSqIds, 23);
    if (parentSoIds.size > 0) await recalculateParentStatuses(tx, parentSoIds, 17);

    return getById(id);
  });
};

export const reopen = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
    if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
    await tx.update(arInvoices).set({ docStatus: "O", canceled: "N" }).where(eq(arInvoices.id, id));

    const lines = await tx
      .select({ baseEntry: arInvoiceLines.baseEntry, baseType: arInvoiceLines.baseType })
      .from(arInvoiceLines)
      .where(eq(arInvoiceLines.docEntry, id));

    const parentSqIds = new Set<number>();
    const parentSoIds = new Set<number>();
    for (const l of lines) {
      if (l.baseEntry) {
        if (l.baseType === 23) parentSqIds.add(l.baseEntry);
        else if (l.baseType === 17) parentSoIds.add(l.baseEntry);
      }
    }

    if (parentSqIds.size > 0) await recalculateParentStatuses(tx, parentSqIds, 23);
    if (parentSoIds.size > 0) await recalculateParentStatuses(tx, parentSoIds, 17);

    return getById(id);
  });
};

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("ar_invoices", "ar_invoices", 70000);
};

export const arInvoiceService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  reopen,
  update,
};
