// Purchase Order Service: CRUD for purchase orders against local PostgreSQL via Drizzle.
// Mirrors hana-backend/src/services/purchase-order.service.ts without SAP Service Layer logic.

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateLineTotal } from "@/services/discount.util";

export interface POListFilters {
  page?: number;
  limit?: number;
  cardCode?: string;
  docStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface POLineInput {
  lineNum: number;
  itemCode: string;
  itemDescription?: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  vatGroup?: string;
  warehouseCode?: string;
  uomCode?: string;
}

export interface CreatePOInput {
  docNum: number;
  docDate: string;
  docDueDate?: string;
  cardCode: string;
  cardName?: string;
  docCurrency?: string;
  address?: string;
  address2?: string;
  comments?: string;
  salesPersonCode?: number;
  discountPercent?: number;
  lines: POLineInput[];
}

// ─── Listing ────────────────────────────────────────────────────────────────

export const getList = async (filters: POListFilters = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const whereConditions = and(
    filters.cardCode ? eq(purchaseOrders.cardCode, filters.cardCode) : undefined,
    filters.docStatus ? eq(purchaseOrders.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${purchaseOrders.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${purchaseOrders.docDate} <= ${filters.dateTo}` : undefined,
    filters.search
      ? or(
          sql`CAST(${purchaseOrders.docNum} AS TEXT) LIKE ${`%${filters.search}%`}`,
          like(purchaseOrders.cardName, `%${filters.search}%`),
          like(purchaseOrders.cardCode, `%${filters.search}%`),
        )
      : undefined,
  );

  const [totalResult] = await db
    .select({ total: count() })
    .from(purchaseOrders)
    .where(whereConditions);

  const total = Number(totalResult.total);
  const totalPages = Math.ceil(total / limit);

  const rows = await db
    .select()
    .from(purchaseOrders)
    .where(whereConditions)
    .orderBy(desc(purchaseOrders.docNum))
    .limit(limit)
    .offset(offset);

  return { data: rows, total, page, limit, totalPages };
};

// ─── Single Record ──────────────────────────────────────────────────────────

export const getById = async (id: number) => {
  const db = getDb();

  const [header] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);

  if (!header) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  const lines = await db
    .select()
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.docEntry, id))
    .orderBy(asc(purchaseOrderLines.lineNum));

  return { ...header, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();

  const [header] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.docNum, docNum))
    .limit(1);

  if (!header) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  const lines = await db
    .select()
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.docEntry, header.id))
    .orderBy(asc(purchaseOrderLines.lineNum));

  return { ...header, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = getSafeDocNumLimit(limit);

  const rows = await db
    .select({ docNum: purchaseOrders.docNum })
    .from(purchaseOrders)
    .where(search ? sql`CAST(${purchaseOrders.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(safeLimit)
    .orderBy(desc(purchaseOrders.docNum));

  return rows.map((r) => r.docNum);
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const create = async (payload: CreatePOInput) => {
  const db = getDb();

  const lineTotal = payload.lines.reduce(
    (sum, l) => sum + calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent),
    0,
  );

  const [header] = await db
    .insert(purchaseOrders)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? null,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docTotal: String(lineTotal),
      docCurrency: payload.docCurrency ?? null,
      docStatus: "O",
      address: payload.address ?? null,
      address2: payload.address2 ?? null,
      comments: payload.comments ?? null,
      salesPersonCode: payload.salesPersonCode ?? null,
      discountPercent: payload.discountPercent ? String(payload.discountPercent) : null,
    })
    .returning();

  if (payload.lines.length > 0) {
    await db.insert(purchaseOrderLines).values(
      payload.lines.map((l) => ({
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
        lineTotal: String(calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent)),
      })),
    );
  }

  logger.info({ docNum: payload.docNum, id: header.id }, "Purchase order created");

  return getById(header.id);
};

export const update = async (id: number, payload: Partial<CreatePOInput>) => {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  await db
    .update(purchaseOrders)
    .set({
      docDate: payload.docDate ?? undefined,
      docDueDate: payload.docDueDate ?? undefined,
      cardCode: payload.cardCode ?? undefined,
      cardName: payload.cardName ?? undefined,
      docCurrency: payload.docCurrency ?? undefined,
      address: payload.address ?? undefined,
      address2: payload.address2 ?? undefined,
      comments: payload.comments ?? undefined,
      salesPersonCode: payload.salesPersonCode ?? undefined,
      discountPercent:
        payload.discountPercent != null ? String(payload.discountPercent) : undefined,
    })
    .where(eq(purchaseOrders.id, id));

  if (payload.lines) {
    await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.docEntry, id));

    await db.insert(purchaseOrderLines).values(
      payload.lines.map((l) => ({
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
        lineTotal: String(calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent)),
      })),
    );
  }

  logger.info({ id }, "Purchase order updated");
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  await db.update(purchaseOrders).set({ docStatus: "C" }).where(eq(purchaseOrders.id, id));

  logger.info({ id, docNum: existing.docNum }, "Purchase order cancelled");
  return getById(id);
};

export const purchaseOrderService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
};
