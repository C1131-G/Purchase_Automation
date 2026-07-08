// Sales Quotation Service: Full CRUD for sales quotations.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
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
    DocNum: salesQuotations.docNum,
    DocDate: salesQuotations.docDate,
    CardCode: salesQuotations.cardCode,
    CardName: salesQuotations.cardName,
    DocTotal: salesQuotations.docTotal,
    DocStatus: salesQuotations.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(salesQuotations, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(salesQuotations).where(where);
  const rows = await db
    .select()
    .from(salesQuotations)
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
  const [h] = await db.select().from(salesQuotations).where(eq(salesQuotations.id, id)).limit(1);
  if (!h) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(salesQuotationLines)
    .where(eq(salesQuotationLines.docEntry, id))
    .orderBy(asc(salesQuotationLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let h;
  if (draftDocEntry && draftDocEntry > 0) {
    [h] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.id, draftDocEntry))
      .limit(1);
  } else {
    [h] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.docNum, docNum))
      .limit(1);
  }
  if (!h) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(salesQuotationLines)
    .where(eq(salesQuotationLines.docEntry, h.id))
    .orderBy(asc(salesQuotationLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: salesQuotations.docNum })
    .from(salesQuotations)
    .where(search ? sql`CAST(${salesQuotations.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(salesQuotations.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const isDraft = payload.isDraft === true;
  const draftDocEntry = payload.draftDocEntry;

  if (!isDraft && draftDocEntry && draftDocEntry > 0) {
    const [existing] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.id, draftDocEntry))
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
      .update(salesQuotations)
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
        salesPersonCode: payload.salesPersonCode ?? null,
      })
      .where(eq(salesQuotations.id, draftDocEntry));

    await db.delete(salesQuotationLines).where(eq(salesQuotationLines.docEntry, draftDocEntry));
    if (payload.lines?.length) {
      await db.insert(salesQuotationLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: draftDocEntry,
          lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
          itemCode: l.itemCode,
          itemDescription: l.itemDescription ?? null,
          quantity: String(l.quantity),
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
          discountPercent: l.discountPercent != null ? String(l.discountPercent) : null,
          vatGroup: l.vatGroup ?? null,
          vatPercent: l.vatPercent != null ? String(l.vatPercent) : null,
          warehouseCode: l.warehouseCode ?? null,
          uomCode: l.uomCode ?? null,
          lineTotal: String((l.unitPrice ?? 0) * l.quantity),
          openQty: String(l.quantity),
        })),
      );
    }

    logger.info({ docNum, id: draftDocEntry }, "Draft converted to real Sales quotation");
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
    .insert(salesQuotations)
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
      salesPersonCode: payload.salesPersonCode ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(salesQuotationLines).values(
      payload.lines.map((l: any, idx: number) => ({
        docEntry: h.id,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription ?? null,
        quantity: String(l.quantity),
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        discountPercent: l.discountPercent != null ? String(l.discountPercent) : null,
        vatGroup: l.vatGroup ?? null,
        vatPercent: l.vatPercent != null ? String(l.vatPercent) : null,
        warehouseCode: l.warehouseCode ?? null,
        uomCode: l.uomCode ?? null,
        lineTotal: String((l.unitPrice ?? 0) * l.quantity),
        openQty: String(l.quantity),
      })),
    );
  }

  logger.info({ docNum: payload.docNum }, "Sales quotation created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(salesQuotations).where(eq(salesQuotations.id, id)).limit(1);
  if (!ex) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");

  const updatedDocStatus = payload.isDraft === true ? "D" : ex.docStatus;
  const lineTotal = payload.lines
    ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
    : Number(ex.docTotal);

  await db
    .update(salesQuotations)
    .set({
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? undefined,
      docStatus: updatedDocStatus,
      docTotal: String(lineTotal),
      address: payload.address ?? undefined,
      address2: payload.address2 ?? undefined,
      comments: payload.comments,
      numAtCard: payload.numAtCard ?? undefined,
      docCurrency: payload.docCurrency,
    })
    .where(eq(salesQuotations.id, id));

  if (payload.lines) {
    await db.delete(salesQuotationLines).where(eq(salesQuotationLines.docEntry, id));
    await db.insert(salesQuotationLines).values(
      payload.lines.map((l: any, idx: number) => ({
        docEntry: id,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription ?? null,
        quantity: String(l.quantity),
        unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        discountPercent: l.discountPercent != null ? String(l.discountPercent) : null,
        vatGroup: l.vatGroup ?? null,
        warehouseCode: l.warehouseCode ?? null,
        uomCode: l.uomCode ?? null,
        lineTotal: String((l.unitPrice ?? 0) * l.quantity),
        openQty: String(l.quantity),
      })),
    );
  }
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(salesQuotations).where(eq(salesQuotations.id, id)).limit(1);
  if (!ex) throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  await db.update(salesQuotations).set({ docStatus: "C" }).where(eq(salesQuotations.id, id));
  return getById(id);
};

export const salesQuotationService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
