import { AppError } from "@/core/errors/app-error";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateOpenQty } from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { purchaseOrderRepository } from "./purchase-order.repository";

// ─── Listing ────────────────────────────────────────────────────────────────

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: purchaseOrders.cardCode,
    CardName: purchaseOrders.cardName,
    DocDate: purchaseOrders.docDate,
    DocNum: purchaseOrders.docNum,
    DocStatus: purchaseOrders.docStatus,
    DocTotal: purchaseOrders.docTotal,
  };

  const { where, orderBy } = buildSqlListFilters(purchaseOrders, filters, sortColumns);

  const total = await purchaseOrderRepository.countList(db, where);
  const totalPages = Math.ceil(total / limit);

  const rows = await purchaseOrderRepository.findList(db, where, orderBy, limit, offset);

  return { data: rows, limit, page, total, totalPages };
};

// ─── Single Record ──────────────────────────────────────────────────────────

export const getById = async (id: number) => {
  const db = getDb();
  const header = await purchaseOrderRepository.findById(db, id);

  if (!header) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  const lines = await purchaseOrderRepository.findLines(db, id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 22, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();

  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    header = await purchaseOrderRepository.findById(db, draftDocEntry);
  } else {
    header = await purchaseOrderRepository.findByDocNum(db, docNum);
  }

  if (!header) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  const lines = await purchaseOrderRepository.findLines(db, header.id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 22, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = getSafeDocNumLimit(limit);

  const rows = await purchaseOrderRepository.findDocNums(db, search, safeLimit);

  return rows.map((row: DynRow) => row.docNum);
};

export const previewNextDocNum = async () =>
  await previewNextDocNumHelper("purchase_orders", "purchase_orders", 10_000);
