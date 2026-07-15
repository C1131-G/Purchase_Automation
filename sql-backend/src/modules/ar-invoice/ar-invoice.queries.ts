import { AppError } from "@/core/errors/app-error";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { arInvoices } from "@/db/schema/ar-invoices";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateOpenQty } from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { arInvoiceRepository } from "./ar-invoice.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: arInvoices.cardCode,
    CardName: arInvoices.cardName,
    DocDate: arInvoices.docDate,
    DocNum: arInvoices.docNum,
    DocStatus: arInvoices.docStatus,
    DocTotal: arInvoices.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(arInvoices, filters, sortColumns);

  const total = await arInvoiceRepository.countList(db, where);
  const rows = await arInvoiceRepository.findList(db, where, orderBy, limit, offset);

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
  const header = await arInvoiceRepository.findById(db, id);
  if (!header) {
    throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  }
  const lines = await arInvoiceRepository.findLines(db, id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 13, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    header = await arInvoiceRepository.findById(db, draftDocEntry);
  } else {
    header = await arInvoiceRepository.findByDocNum(db, docNum);
  }
  if (!header) {
    throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
  }
  const lines = await arInvoiceRepository.findLines(db, header.id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 13, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await arInvoiceRepository.findDocNums(db, search, getSafeDocNumLimit(limit));
  return rows.map((row: DynRow) => row.docNum);
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("ar_invoices", "ar_invoices", 80_000);
