// Inventory Transfer Request Service: CRUD for inventory transfer requests.
// Matches hana-backend's transfer-request.service.ts (read-only) + adds create capability.

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransferRequestLines } from "@/db/schema/inventory-transfer-request-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = and(
    filters.docStatus ? eq(inventoryTransferRequests.docStatus, filters.docStatus) : undefined,
    filters.dateFrom ? sql`${inventoryTransferRequests.docDate} >= ${filters.dateFrom}` : undefined,
    filters.dateTo ? sql`${inventoryTransferRequests.docDate} <= ${filters.dateTo}` : undefined,
  );
  const [t] = await db.select({ total: count() }).from(inventoryTransferRequests).where(where);
  const rows = await db
    .select()
    .from(inventoryTransferRequests)
    .where(where)
    .orderBy(desc(inventoryTransferRequests.docNum))
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
  const [h] = await db
    .select()
    .from(inventoryTransferRequests)
    .where(eq(inventoryTransferRequests.id, id))
    .limit(1);
  if (!h) throw new AppError("Inventory transfer request not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(inventoryTransferRequestLines)
    .where(eq(inventoryTransferRequestLines.docEntry, id))
    .orderBy(asc(inventoryTransferRequestLines.lineNum));
  return { ...h, DocumentLines: lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db
    .select()
    .from(inventoryTransferRequests)
    .where(eq(inventoryTransferRequests.docNum, docNum))
    .limit(1);
  if (!h) throw new AppError("Inventory transfer request not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(inventoryTransferRequestLines)
    .where(eq(inventoryTransferRequestLines.docEntry, h.id))
    .orderBy(asc(inventoryTransferRequestLines.lineNum));
  return { ...h, DocumentLines: lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100000);
  const rows = await db
    .select({ docNum: inventoryTransferRequests.docNum })
    .from(inventoryTransferRequests)
    .where(
      search
        ? sql`CAST(${inventoryTransferRequests.docNum} AS TEXT) LIKE ${`%${search}%`}`
        : undefined,
    )
    .limit(safeLimit)
    .orderBy(desc(inventoryTransferRequests.docNum));
  return rows.map((r) => ({ code: r.docNum, name: String(r.docNum) }));
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(inventoryTransferRequests)
    .values({
      docNum: payload.docNum,
      docDate: payload.docDate,
      docStatus: "O",
      comments: payload.comments ?? null,
      toWarehouseCode: payload.toWarehouseCode ?? null,
      docCurrency: payload.docCurrency ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(inventoryTransferRequestLines).values(
      payload.lines.map((l: any) => ({
        docEntry: h.id,
        lineNum: l.lineNum,
        itemCode: l.itemCode,
        dscription: l.dscription ?? null,
        quantity: String(l.quantity),
        fromWarehouseCode: l.fromWarehouseCode ?? null,
        warehouseCode: l.warehouseCode ?? null,
        openQty: String(l.quantity),
        lineStatus: "O",
      })),
    );
  }

  logger.info({ docNum: payload.docNum }, "Inventory transfer request created");
  return getById(h.id);
};

export const inventoryTransferRequestService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
};
