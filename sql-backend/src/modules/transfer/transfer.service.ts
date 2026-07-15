import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import type { DynRow } from "@/types/drizzle.types";

import { transferRepository } from "./transfer.repository";

export const getList = async (filters: Record<string, unknown> = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocDate: inventoryTransfers.docDate,
    DocNum: inventoryTransfers.docNum,
    DocStatus: inventoryTransfers.docStatus,
    DocTotal: inventoryTransfers.docTotal,
    Filler: inventoryTransfers.filler,
    ToWhsCode: inventoryTransfers.toWarehouseCode,
  };
  const { where, orderBy } = buildSqlListFilters(inventoryTransfers, filters, sortColumns);

  const total = await transferRepository.countList(db, where);
  const rows = await transferRepository.findList(db, where, orderBy, limit, offset);

  return {
    data: rows,
    limit,
    page,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const getById = async (id: number) => {
  const db = getDb();
  const h = await transferRepository.findById(db, id);
  if (!h) {
    throw new AppError("Inventory transfer not found", 404, "NOT_FOUND");
  }
  const lines = await transferRepository.findLines(db, id);
  return { ...h, lines };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const h = await transferRepository.findByDocNum(db, docNum);
  if (!h) {
    throw new AppError("Inventory transfer not found", 404, "NOT_FOUND");
  }
  const lines = await transferRepository.findLines(db, h.id);
  return { ...h, lines };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100_000);
  const rows = await transferRepository.findDocNums(db, search, safeLimit);
  return rows.map((r: DynRow) => ({ code: r.docNum, name: String(r.docNum) }));
};

export const create = async (payload: Record<string, unknown>) => {
  const db = getDb();
  const { docNum } = payload;
  const lines = Array.isArray(payload.lines) ? (payload.lines as Record<string, unknown>[]) : [];

  const h = await transferRepository.insertHeader(db, {
    comments: (payload.comments as string | null) ?? null,
    docCurrency: (payload.docCurrency as string | null) ?? null,
    docDate: payload.docDate as string,
    docNum: docNum as number,
    docStatus: "O",
    toWarehouseCode: (payload.toWarehouseCode as string | null) ?? null,
  });

  if (lines.length > 0) {
    await transferRepository.insertLines(
      db,
      lines.map((l, idx) => ({
        docEntry: h.id,
        dscription: (l.dscription as string | null) ?? null,
        fromWarehouseCode: (l.fromWarehouseCode as string | null) ?? null,
        itemCode: l.itemCode as string,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? (l.lineNum as number) : idx,
        quantity: String(l.quantity),
        warehouseCode: (l.warehouseCode as string | null) ?? null,
      })),
    );
  }

  logger.info({ docNum }, "Inventory transfer created");
  return getById(h.id);
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("inventory_transfers", "inventory_transfers", 83_000);

export const inventoryTransferService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
};
