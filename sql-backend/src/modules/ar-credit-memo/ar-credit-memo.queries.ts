import { AppError } from "@/core/errors/app-error";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateOpenQty } from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { arCreditMemoRepository } from "./ar-credit-memo.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: arCreditMemos.cardCode,
    CardName: arCreditMemos.cardName,
    DocDate: arCreditMemos.docDate,
    DocNum: arCreditMemos.docNum,
    DocStatus: arCreditMemos.docStatus,
    DocTotal: arCreditMemos.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(arCreditMemos, filters, sortColumns);

  const total = await arCreditMemoRepository.countList(db, where);
  const rows = await arCreditMemoRepository.findList(db, where, orderBy, limit, offset);

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
  const header = await arCreditMemoRepository.findById(db, id);
  if (!header) {
    throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
  }
  const lines = await arCreditMemoRepository.findLines(db, id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 16, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    header = await arCreditMemoRepository.findById(db, draftDocEntry);
  } else {
    header = await arCreditMemoRepository.findByDocNum(db, docNum);
  }
  if (!header) {
    throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
  }
  const lines = await arCreditMemoRepository.findLines(db, header.id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 16, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await arCreditMemoRepository.findDocNums(db, search, getSafeDocNumLimit(limit));
  return rows.map((row: DynRow) => row.docNum);
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("ar_credit_memos", "ar_credit_memos", 90_000);
