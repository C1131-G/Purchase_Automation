import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import type { DynRow } from "@/types/drizzle.types";

import { transferRequestRepository } from "./transfer-request.repository";

export const getList = async (filters: Record<string, unknown> = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocDate: inventoryTransferRequests.docDate,
    DocNum: inventoryTransferRequests.docNum,
    DocStatus: inventoryTransferRequests.docStatus,
    DocTotal: inventoryTransferRequests.docTotal,
    Filler: inventoryTransferRequests.filler,
    ToWhsCode: inventoryTransferRequests.toWarehouseCode,
  };
  const { where, orderBy } = buildSqlListFilters(inventoryTransferRequests, filters, sortColumns);

  const total = await transferRequestRepository.countList(db, where);
  const rows = await transferRequestRepository.findList(db, where, orderBy, limit, offset);

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
  const h = await transferRequestRepository.findById(db, id);
  if (!h) {
    throw new AppError("Inventory transfer request not found", 404, "NOT_FOUND");
  }
  const lines = await transferRequestRepository.findLines(db, id);
  const linesWithQty = lines.map((l: DynRow) => ({
    ...l,
    openQty: l.quantity,
  }));
  return { ...h, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const h = await transferRequestRepository.findByDocNum(db, docNum);
  if (!h) {
    throw new AppError("Inventory transfer request not found", 404, "NOT_FOUND");
  }
  const lines = await transferRequestRepository.findLines(db, h.id);
  const linesWithQty = lines.map((l: DynRow) => ({
    ...l,
    openQty: l.quantity,
  }));
  return { ...h, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100_000);
  const rows = await transferRequestRepository.findDocNums(db, search, safeLimit);
  return rows.map((r: DynRow) => ({ code: r.docNum, name: String(r.docNum) }));
};

export const create = async (payload: Record<string, unknown>) => {
  const db = getDb();
  const { docNum } = payload;
  const lines = Array.isArray(payload.lines) ? (payload.lines as Record<string, unknown>[]) : [];

  const h = await transferRequestRepository.insertHeader(db, {
    comments: (payload.comments as string | null) ?? null,
    docCurrency: (payload.docCurrency as string | null) ?? null,
    docDate: payload.docDate as string,
    docNum: docNum as number,
    docStatus: "O",
    toWarehouseCode: (payload.toWarehouseCode as string | null) ?? null,
  });

  if (lines.length > 0) {
    await transferRequestRepository.insertLines(
      db,
      lines.map((l, idx) => ({
        docEntry: h.id,
        dscription: (l.dscription as string | null) ?? null,
        fromWarehouseCode: (l.fromWarehouseCode as string | null) ?? null,
        itemCode: l.itemCode as string,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? (l.lineNum as number) : idx,
        lineStatus: "O",
        quantity: String(l.quantity),
        warehouseCode: (l.warehouseCode as string | null) ?? null,
      })),
    );
  }

  logger.info({ docNum }, "Inventory transfer request created");
  return getById(h.id);
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("inventory_transfer_requests", "inventory_transfer_requests", 82_000);

export const inventoryTransferRequestService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
};
