import { AppError } from "@/core/errors/app-error";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { salesOrders } from "@/db/schema/sales-orders";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateOpenQty } from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { salesOrderRepository } from "./sales-order.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: salesOrders.cardCode,
    CardName: salesOrders.cardName,
    DocDate: salesOrders.docDate,
    DocNum: salesOrders.docNum,
    DocStatus: salesOrders.docStatus,
    DocTotal: salesOrders.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(salesOrders, filters, sortColumns);

  const total = await salesOrderRepository.countList(db, where);
  const rows = await salesOrderRepository.findList(db, where, orderBy, limit, offset);

  return {
    data: rows,
    limit,
    page,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

// ─── Single Record ──────────────────────────────────────────────────────────

export const getById = async (id: number) => {
  const db = getDb();
  const header = await salesOrderRepository.findById(db, id);
  if (!header) {
    throw new AppError("Sales order not found", 404, "NOT_FOUND");
  }
  const lines = await salesOrderRepository.findLines(db, id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 17, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    header = await salesOrderRepository.findById(db, draftDocEntry);
  } else {
    header = await salesOrderRepository.findByDocNum(db, docNum);
  }
  if (!header) {
    throw new AppError("Sales order not found", 404, "NOT_FOUND");
  }
  const lines = await salesOrderRepository.findLines(db, header.id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 17, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await salesOrderRepository.findDocNums(db, search, getSafeDocNumLimit(limit));
  return rows.map((row: DynRow) => row.docNum);
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("sales_orders", "sales_orders", 30_000);
