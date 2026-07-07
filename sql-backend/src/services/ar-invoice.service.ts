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
  return { ...h, lines };
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
  return { ...h, lines };
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
  const isDraft = payload.isDraft === true;
  const draftDocEntry = payload.draftDocEntry;

  if (!isDraft && draftDocEntry && draftDocEntry > 0) {
    const [existing] = await db
      .select()
      .from(arInvoices)
      .where(eq(arInvoices.id, draftDocEntry))
      .limit(1);

    if (!existing) {
      throw new AppError("Draft document not found", 404, "NOT_FOUND");
    }

    const docNum = payload.docNum;
    const lineTotal = payload.lines.reduce(
      (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
      0,
    );

    await db
      .update(arInvoices)
      .set({
        docNum,
        docDate: payload.docDate,
        cardCode: payload.cardCode,
        cardName: payload.cardName ?? null,
        docCurrency: payload.docCurrency ?? null,
        docStatus: "O",
        docTotal: String(lineTotal),
        numAtCard: payload.numAtCard ?? null,
      })
      .where(eq(arInvoices.id, draftDocEntry));

    await db.delete(arInvoiceLines).where(eq(arInvoiceLines.docEntry, draftDocEntry));
    if (payload.lines?.length) {
      await db.insert(arInvoiceLines).values(
        payload.lines.map((l: any) => ({
          docEntry: draftDocEntry,
          lineNum: l.lineNum,
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

    logger.info({ docNum, id: draftDocEntry }, "Draft converted to real AR Invoice");
    return getById(draftDocEntry);
  }

  const docStatus = isDraft ? "D" : "O";
  const docNum = payload.docNum;
  const lineTotal = payload.lines.reduce(
    (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
    0,
  );

  const [h] = await db
    .insert(arInvoices)
    .values({
      docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docStatus,
      docTotal: String(lineTotal),
      numAtCard: payload.numAtCard ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(arInvoiceLines).values(
      payload.lines.map((l: any) => ({
        docEntry: h.id,
        lineNum: l.lineNum,
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

  logger.info({ docNum: payload.docNum }, "AR Invoice created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [ex] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");

  const updatedDocStatus = payload.isDraft === true ? "D" : ex.docStatus;
  const lineTotal = payload.lines
    ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
    : Number(ex.docTotal);

  await db
    .update(arInvoices)
    .set({
      docDate: payload.docDate,
      docCurrency: payload.docCurrency,
      docStatus: updatedDocStatus,
      docTotal: String(lineTotal),
      numAtCard: payload.numAtCard ?? undefined,
    })
    .where(eq(arInvoices.id, id));

  if (payload.lines) {
    await db.delete(arInvoiceLines).where(eq(arInvoiceLines.docEntry, id));
    await db.insert(arInvoiceLines).values(
      payload.lines.map((l: any) => ({
        docEntry: id,
        lineNum: l.lineNum,
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
  const [ex] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  await db.update(arInvoices).set({ docStatus: "C" }).where(eq(arInvoices.id, id));
  return getById(id);
};

export const reopen = async (id: number) => {
  const db = getDb();
  const [ex] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
  if (!ex) throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  await db.update(arInvoices).set({ docStatus: "O" }).where(eq(arInvoices.id, id));
  return getById(id);
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
