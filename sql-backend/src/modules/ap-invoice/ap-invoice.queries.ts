import { AppError } from "@/core/errors/app-error";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { apInvoices } from "@/db/schema/ap-invoices";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateOpenQty } from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { apInvoiceRepository } from "./ap-invoice.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: apInvoices.cardCode,
    CardName: apInvoices.cardName,
    DocDate: apInvoices.docDate,
    DocNum: apInvoices.docNum,
    DocStatus: apInvoices.docStatus,
    DocTotal: apInvoices.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(apInvoices, filters, sortColumns);

  const total = await apInvoiceRepository.countList(db, where);
  const rows = await apInvoiceRepository.findList(db, where, orderBy, limit, offset);

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
  const header = await apInvoiceRepository.findById(db, id);
  if (!header) {
    throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  }
  const lines = await apInvoiceRepository.findLines(db, id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 18, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    header = await apInvoiceRepository.findById(db, draftDocEntry);
  } else {
    header = await apInvoiceRepository.findByDocNum(db, docNum);
  }
  if (!header) {
    throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
  }
  const lines = await apInvoiceRepository.findLines(db, header.id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 18, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await apInvoiceRepository.findDocNums(db, search, getSafeDocNumLimit(limit));
  return rows.map((row: DynRow) => row.docNum);
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("ap_invoices", "ap_invoices", 60_000);
