// Purchase Quotation Service: CRUD for purchase quotations against local PostgreSQL via Drizzle.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { getNextDocNum, previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series";
import { buildSqlListFilters } from "@/core/utils/query-helper";
import { resolveCardName } from "@/services/master-data.service";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: purchaseQuotations.docNum,
    DocDate: purchaseQuotations.docDate,
    CardCode: purchaseQuotations.cardCode,
    CardName: purchaseQuotations.cardName,
    DocTotal: purchaseQuotations.docTotal,
    DocStatus: purchaseQuotations.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(purchaseQuotations, filters, sortColumns);

  const [totalResult] = await db.select({ total: count() }).from(purchaseQuotations).where(where);
  const total = Number(totalResult.total);

  const rows = await db
    .select()
    .from(purchaseQuotations)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getById = async (id: number) => {
  const db = getDb();
  const [header] = await db
    .select()
    .from(purchaseQuotations)
    .where(eq(purchaseQuotations.id, id))
    .limit(1);
  if (!header) throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(purchaseQuotationLines)
    .where(eq(purchaseQuotationLines.docEntry, id))
    .orderBy(asc(purchaseQuotationLines.lineNum));
  return { ...header, lines };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    [header] = await db
      .select()
      .from(purchaseQuotations)
      .where(eq(purchaseQuotations.id, draftDocEntry))
      .limit(1);
  } else {
    [header] = await db
      .select()
      .from(purchaseQuotations)
      .where(eq(purchaseQuotations.docNum, docNum))
      .limit(1);
  }
  if (!header) throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(purchaseQuotationLines)
    .where(eq(purchaseQuotationLines.docEntry, header.id))
    .orderBy(asc(purchaseQuotationLines.lineNum));
  return { ...header, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = getSafeDocNumLimit(limit);
  const rows = await db
    .select({ docNum: purchaseQuotations.docNum })
    .from(purchaseQuotations)
    .where(
      search ? sql`CAST(${purchaseQuotations.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined,
    )
    .limit(safeLimit)
    .orderBy(desc(purchaseQuotations.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const isDraft = payload.isDraft === true;
  const draftDocEntry = payload.draftDocEntry;

  if (!isDraft && draftDocEntry && draftDocEntry > 0) {
    const [existing] = await db
      .select()
      .from(purchaseQuotations)
      .where(eq(purchaseQuotations.id, draftDocEntry))
      .limit(1);

    if (!existing) {
      throw new AppError("Draft document not found", 404, "NOT_FOUND");
    }

    const docNum = await getNextDocNum("purchase_quotations", "purchase_quotations", 10000);
    const lineTotal = payload.lines.reduce(
      (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
      0,
    );

    const cardName = await resolveCardName(payload.cardCode, payload.cardName);

    await db
      .update(purchaseQuotations)
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
      .where(eq(purchaseQuotations.id, draftDocEntry));

    await db
      .delete(purchaseQuotationLines)
      .where(eq(purchaseQuotationLines.docEntry, draftDocEntry));
    if (payload.lines?.length) {
      await db.insert(purchaseQuotationLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: draftDocEntry,
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
        })),
      );
    }

    logger.info({ docNum, id: draftDocEntry }, "Draft converted to real Purchase quotation");
    return getById(draftDocEntry);
  }

  const docStatus = isDraft ? "D" : "O";
  const docNum = await getNextDocNum("purchase_quotations", "purchase_quotations", 10000);
  const lineTotal = payload.lines.reduce(
    (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
    0,
  );

  const cardName = await resolveCardName(payload.cardCode, payload.cardName);

  const [header] = await db
    .insert(purchaseQuotations)
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
    await db.insert(purchaseQuotationLines).values(
      payload.lines.map((l: any, idx: number) => ({
        docEntry: header.id,
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
      })),
    );
  }

  logger.info({ docNum }, "Purchase quotation created");
  return getById(header.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(purchaseQuotations)
    .where(eq(purchaseQuotations.id, id))
    .limit(1);
  if (!existing) throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");

  const updatedDocStatus = payload.isDraft === true ? "D" : existing.docStatus;
  const lineTotal = payload.lines
    ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
    : Number(existing.docTotal);

  const cardName = await resolveCardName(
    payload.cardCode ?? existing.cardCode,
    payload.cardName !== undefined ? payload.cardName : existing.cardName,
  );

  await db
    .update(purchaseQuotations)
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
      salesPersonCode: payload.salesPersonCode,
      cardName: cardName ?? undefined,
    })
    .where(eq(purchaseQuotations.id, id));

  if (payload.lines) {
    await db.delete(purchaseQuotationLines).where(eq(purchaseQuotationLines.docEntry, id));
    await db.insert(purchaseQuotationLines).values(
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
      })),
    );
  }

  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(purchaseQuotations)
    .where(eq(purchaseQuotations.id, id))
    .limit(1);
  if (!existing) throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");
  await db.update(purchaseQuotations).set({ docStatus: "C" }).where(eq(purchaseQuotations.id, id));
  return getById(id);
};

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("purchase_quotations", "purchase_quotations", 10000);
};

export const purchaseQuotationService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
