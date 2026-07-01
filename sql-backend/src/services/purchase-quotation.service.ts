// Purchase Quotation Service: CRUD for purchase quotations against local PostgreSQL via Drizzle.

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const where = and(
    filters.cardCode ? eq(purchaseQuotations.cardCode, filters.cardCode) : undefined,
    filters.docStatus ? eq(purchaseQuotations.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${purchaseQuotations.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${purchaseQuotations.docDate} <= ${filters.dateTo}` : undefined,
    filters.search
      ? or(
          sql`CAST(${purchaseQuotations.docNum} AS TEXT) LIKE ${`%${filters.search}%`}`,
          like(purchaseQuotations.cardName, `%${filters.search}%`),
        )
      : undefined,
  );

  const [totalResult] = await db.select({ total: count() }).from(purchaseQuotations).where(where);
  const total = Number(totalResult.total);

  const rows = await db
    .select()
    .from(purchaseQuotations)
    .where(where)
    .orderBy(desc(purchaseQuotations.docNum))
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

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [header] = await db
    .select()
    .from(purchaseQuotations)
    .where(eq(purchaseQuotations.docNum, docNum))
    .limit(1);
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
  const [header] = await db
    .insert(purchaseQuotations)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docStatus: "O",
      comments: payload.comments ?? null,
      salesPersonCode: payload.salesPersonCode ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(purchaseQuotationLines).values(
      payload.lines.map((l: any) => ({
        docEntry: header.id,
        lineNum: l.lineNum,
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

  logger.info({ docNum: payload.docNum }, "Purchase quotation created");
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

  await db
    .update(purchaseQuotations)
    .set({
      docDate: payload.docDate,
      docCurrency: payload.docCurrency,
      comments: payload.comments,
      salesPersonCode: payload.salesPersonCode,
    })
    .where(eq(purchaseQuotations.id, id));

  if (payload.lines) {
    await db.delete(purchaseQuotationLines).where(eq(purchaseQuotationLines.docEntry, id));
    await db.insert(purchaseQuotationLines).values(
      payload.lines.map((l: any) => ({
        docEntry: id,
        lineNum: l.lineNum,
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

export const purchaseQuotationService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
