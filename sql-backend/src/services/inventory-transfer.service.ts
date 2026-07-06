// Inventory Transfer Service: CRUD for inventory transfers.
// Matches hana-backend's transfer.service.ts (read-only) + adds create capability.

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series";
import { buildSqlListFilters } from "@/core/utils/query-helper";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: inventoryTransfers.docNum,
    DocDate: inventoryTransfers.docDate,
    DocTotal: inventoryTransfers.docTotal,
    DocStatus: inventoryTransfers.docStatus,
    Filler: inventoryTransfers.filler,
    ToWhsCode: inventoryTransfers.toWarehouseCode,
  };
  const { where, orderBy } = buildSqlListFilters(inventoryTransfers, filters, sortColumns);

  const [t] = await db.select({ total: count() }).from(inventoryTransfers).where(where);
  const rows = await db
    .select()
    .from(inventoryTransfers)
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
  const [h] = await db
    .select()
    .from(inventoryTransfers)
    .where(eq(inventoryTransfers.id, id))
    .limit(1);
  if (!h) throw new AppError("Inventory transfer not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(inventoryTransferLines)
    .where(eq(inventoryTransferLines.docEntry, id))
    .orderBy(asc(inventoryTransferLines.lineNum));
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const [h] = await db
    .select()
    .from(inventoryTransfers)
    .where(eq(inventoryTransfers.docNum, docNum))
    .limit(1);
  if (!h) throw new AppError("Inventory transfer not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(inventoryTransferLines)
    .where(eq(inventoryTransferLines.docEntry, h.id))
    .orderBy(asc(inventoryTransferLines.lineNum));
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100000);
  const rows = await db
    .select({ docNum: inventoryTransfers.docNum })
    .from(inventoryTransfers)
    .where(
      search ? sql`CAST(${inventoryTransfers.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined,
    )
    .limit(safeLimit)
    .orderBy(desc(inventoryTransfers.docNum));
  return rows.map((r) => ({ code: r.docNum, name: String(r.docNum) }));
};

export const create = async (payload: any) => {
  const db = getDb();
  const [h] = await db
    .insert(inventoryTransfers)
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
    await db.insert(inventoryTransferLines).values(
      payload.lines.map((l: any) => ({
        docEntry: h.id,
        lineNum: l.lineNum,
        itemCode: l.itemCode,
        dscription: l.dscription ?? null,
        quantity: String(l.quantity),
        fromWarehouseCode: l.fromWarehouseCode ?? null,
        warehouseCode: l.warehouseCode ?? null,
      })),
    );
  }

  logger.info({ docNum }, "Inventory transfer created");
  return getById(h.id);
};

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("inventory_transfers", "inventory_transfers", 83000);
};

export const inventoryTransferService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
};
