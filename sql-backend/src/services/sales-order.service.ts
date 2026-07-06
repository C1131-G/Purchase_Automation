// Sales Order Service: CRUD for sales orders.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { buildSqlListFilters } from "@/core/utils/query-helper";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: salesOrders.docNum,
    DocDate: salesOrders.docDate,
    CardCode: salesOrders.cardCode,
    CardName: salesOrders.cardName,
    DocTotal: salesOrders.docTotal,
    DocStatus: salesOrders.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(salesOrders, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(salesOrders).where(where);
  const rows = await db
    .select()
    .from(salesOrders)
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
  const [h] = await db.select().from(salesOrders).where(eq(salesOrders.id, id)).limit(1);
  if (!h) throw new AppError("Sales order not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(salesOrderLines)
    .where(eq(salesOrderLines.docEntry, id))
    .orderBy(asc(salesOrderLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db.select().from(salesOrders).where(eq(salesOrders.docNum, docNum)).limit(1);
  if (!h) throw new AppError("Sales order not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(salesOrderLines)
    .where(eq(salesOrderLines.docEntry, h.id))
    .orderBy(asc(salesOrderLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: salesOrders.docNum })
    .from(salesOrders)
    .where(search ? sql`CAST(${salesOrders.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(salesOrders.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(salesOrders)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docStatus: "O",
      numAtCard: payload.numAtCard ?? null,
      address: payload.address ?? null,
      address2: payload.address2 ?? null,
      comments: payload.comments ?? null,
      salesPersonCode: payload.salesPersonCode ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(salesOrderLines).values(
      payload.lines.map((l: any) => ({
        docEntry: h.id,
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

  logger.info({ docNum: payload.docNum }, "Sales order created");
  return getById(h.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [existing] = await db.select().from(salesOrders).where(eq(salesOrders.id, id)).limit(1);
  if (!existing) throw new AppError("Sales order not found", 404, "NOT_FOUND");
  await db
    .update(salesOrders)
    .set({
      docDate: payload.docDate,
      comments: payload.comments,
      numAtCard: payload.numAtCard,
    })
    .where(eq(salesOrders.id, id));

  if (payload.lines) {
    await db.delete(salesOrderLines).where(eq(salesOrderLines.docEntry, id));
    await db.insert(salesOrderLines).values(
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
  const [h] = await db.select().from(salesOrders).where(eq(salesOrders.id, id)).limit(1);
  if (!h) throw new AppError("Sales order not found", 404, "NOT_FOUND");
  await db.update(salesOrders).set({ docStatus: "C" }).where(eq(salesOrders.id, id));
  return getById(id);
};

export const salesOrderService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
