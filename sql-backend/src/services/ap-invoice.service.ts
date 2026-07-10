// AP Invoice Service: Full CRUD for AP invoices.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { apInvoices } from "@/db/schema/ap-invoices";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
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
    DocNum: apInvoices.docNum,
    DocDate: apInvoices.docDate,
    CardCode: apInvoices.cardCode,
    CardName: apInvoices.cardName,
    DocTotal: apInvoices.docTotal,
    DocStatus: apInvoices.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(apInvoices, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(apInvoices).where(where);
  const rows = await db
    .select()
    .from(apInvoices)
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
  const [h] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
  if (!h) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(apInvoiceLines)
    .where(eq(apInvoiceLines.docEntry, id))
    .orderBy(asc(apInvoiceLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 18, h.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...h, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let h;
  if (draftDocEntry && draftDocEntry > 0) {
    [h] = await db.select().from(apInvoices).where(eq(apInvoices.id, draftDocEntry)).limit(1);
  } else {
    [h] = await db.select().from(apInvoices).where(eq(apInvoices.docNum, docNum)).limit(1);
  }
  if (!h) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(apInvoiceLines)
    .where(eq(apInvoiceLines.docEntry, h.id))
    .orderBy(asc(apInvoiceLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 18, h.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...h, lines: linesWithQty };
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
        .from(apInvoices)
        .where(eq(apInvoices.id, draftDocEntry))
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
        .update(apInvoices)
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
        .where(eq(apInvoices.id, draftDocEntry));

      await tx.delete(apInvoiceLines).where(eq(apInvoiceLines.docEntry, draftDocEntry));
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum;
      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
        0,
      );

      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      const [header] = await tx
        .insert(apInvoices)
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
      await tx.insert(apInvoiceLines).values(
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
      const poEntries = new Set<number>();
      const grpoEntries = new Set<number>();
      for (const line of payload.lines) {
        const baseType = Number(line.baseType);
        const baseEntry = Number(line.baseEntry);
        if (baseType === 22 && baseEntry) poEntries.add(baseEntry);
        if (baseType === 20 && baseEntry) grpoEntries.add(baseEntry);
      }
      if (poEntries.size > 0) await recalculateParentStatuses(tx, poEntries, 22);
      if (grpoEntries.size > 0) await recalculateParentStatuses(tx, grpoEntries, 20);
    }

    logger.info({ docNum: payload.docNum }, "AP Invoice created");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
    if (!ex) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");

    const isDraft = payload.isDraft === true || ex.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode ?? ex.cardCode, id, 18);
    }

    const updatedDocStatus =
      payload.isDraft === true ? "D" : ex.docStatus === "D" ? "O" : ex.docStatus;
    const lineTotal = payload.lines
      ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
      : Number(ex.docTotal);

    // Save old parent entries before we modify the lines
    const oldLines = await tx
      .select({ baseEntry: apInvoiceLines.baseEntry, baseType: apInvoiceLines.baseType })
      .from(apInvoiceLines)
      .where(eq(apInvoiceLines.docEntry, id));

    const oldPoEntries = new Set<number>();
    const oldGrpoEntries = new Set<number>();
    for (const line of oldLines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 22 && baseEntry) oldPoEntries.add(baseEntry);
      if (baseType === 20 && baseEntry) oldGrpoEntries.add(baseEntry);
    }

    await tx
      .update(apInvoices)
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
      .where(eq(apInvoices.id, id));

    if (payload.lines) {
      await tx.delete(apInvoiceLines).where(eq(apInvoiceLines.docEntry, id));
      await tx.insert(apInvoiceLines).values(
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
        const newPoEntries = new Set<number>();
        const newGrpoEntries = new Set<number>();
        for (const line of payload.lines) {
          const baseType = Number(line.baseType);
          const baseEntry = Number(line.baseEntry);
          if (baseType === 22 && baseEntry) newPoEntries.add(baseEntry);
          if (baseType === 20 && baseEntry) newGrpoEntries.add(baseEntry);
        }

        const allPoEntries = new Set<number>([...oldPoEntries, ...newPoEntries]);
        const allGrpoEntries = new Set<number>([...oldGrpoEntries, ...newGrpoEntries]);

        if (allPoEntries.size > 0) await recalculateParentStatuses(tx, allPoEntries, 22);
        if (allGrpoEntries.size > 0) await recalculateParentStatuses(tx, allGrpoEntries, 20);
      }
    }
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
    if (!ex) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
    await tx.update(apInvoices).set({ docStatus: "C", canceled: "Y" }).where(eq(apInvoices.id, id));

    const lines = await tx
      .select({ baseEntry: apInvoiceLines.baseEntry, baseType: apInvoiceLines.baseType })
      .from(apInvoiceLines)
      .where(eq(apInvoiceLines.docEntry, id));

    const poEntries = new Set<number>();
    const grpoEntries = new Set<number>();
    for (const line of lines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 22 && baseEntry) poEntries.add(baseEntry);
      if (baseType === 20 && baseEntry) grpoEntries.add(baseEntry);
    }
    if (poEntries.size > 0) await recalculateParentStatuses(tx, poEntries, 22);
    if (grpoEntries.size > 0) await recalculateParentStatuses(tx, grpoEntries, 20);

    return getById(id);
  });
};

export const reopen = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
    if (!ex) throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
    await tx.update(apInvoices).set({ docStatus: "O", canceled: "N" }).where(eq(apInvoices.id, id));

    const lines = await tx
      .select({ baseEntry: apInvoiceLines.baseEntry, baseType: apInvoiceLines.baseType })
      .from(apInvoiceLines)
      .where(eq(apInvoiceLines.docEntry, id));

    const poEntries = new Set<number>();
    const grpoEntries = new Set<number>();
    for (const line of lines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 22 && baseEntry) poEntries.add(baseEntry);
      if (baseType === 20 && baseEntry) grpoEntries.add(baseEntry);
    }
    if (poEntries.size > 0) await recalculateParentStatuses(tx, poEntries, 22);
    if (grpoEntries.size > 0) await recalculateParentStatuses(tx, grpoEntries, 20);

    return getById(id);
  });
};

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("ap_invoices", "ap_invoices", 60000);
};

export const apInvoiceService = {
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
