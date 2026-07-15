import { AppError } from "@/core/errors/app-error";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateOpenQty } from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { purchaseQuotationRepository } from "./purchase-quotation.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: purchaseQuotations.cardCode,
    CardName: purchaseQuotations.cardName,
    DocDate: purchaseQuotations.docDate,
    DocNum: purchaseQuotations.docNum,
    DocStatus: purchaseQuotations.docStatus,
    DocTotal: purchaseQuotations.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(purchaseQuotations, filters, sortColumns);

  const total = await purchaseQuotationRepository.countList(db, where);
  const rows = await purchaseQuotationRepository.findList(db, where, orderBy, limit, offset);

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
  const header = await purchaseQuotationRepository.findById(db, id);
  if (!header) {
    throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");
  }
  const lines = await purchaseQuotationRepository.findLines(db, id);
  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(
        db,
        540_000_006,
        header.id,
        line.lineNum,
        Number(line.quantity || 0),
      ),
    })),
  );
  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    header = await purchaseQuotationRepository.findById(db, draftDocEntry);
  } else {
    header = await purchaseQuotationRepository.findByDocNum(db, docNum);
  }
  if (!header) {
    throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");
  }
  const lines = await purchaseQuotationRepository.findLines(db, header.id);
  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(
        db,
        540_000_006,
        header.id,
        line.lineNum,
        Number(line.quantity || 0),
      ),
    })),
  );
  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = getSafeDocNumLimit(limit);
  const rows = await purchaseQuotationRepository.findDocNums(db, search, safeLimit);
  return rows.map((row: DynRow) => row.docNum);
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("purchase_quotations", "purchase_quotations", 10_000);
