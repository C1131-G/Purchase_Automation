import { AppError } from "@/core/errors/app-error";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { grpo } from "@/db/schema/grpo";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateOpenQty } from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { grpoRepository } from "./grpo.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: grpo.cardCode,
    CardName: grpo.cardName,
    DocDate: grpo.docDate,
    DocNum: grpo.docNum,
    DocStatus: grpo.docStatus,
    DocTotal: grpo.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(grpo, filters, sortColumns);

  const total = await grpoRepository.countList(db, where);
  const rows = await grpoRepository.findList(db, where, orderBy, limit, offset);

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
  const header = await grpoRepository.findById(db, id);
  if (!header) {
    throw new AppError("GRPO not found", 404, "NOT_FOUND");
  }
  const lines = await grpoRepository.findLines(db, id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 20, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    header = await grpoRepository.findById(db, draftDocEntry);
  } else {
    header = await grpoRepository.findByDocNum(db, docNum);
  }
  if (!header) {
    throw new AppError("GRPO not found", 404, "NOT_FOUND");
  }
  const lines = await grpoRepository.findLines(db, header.id);

  const linesWithQty = await Promise.all(
    lines.map(async (line: DynRow) => ({
      ...line,
      openQty: await calculateOpenQty(db, 20, header.id, line.lineNum, Number(line.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = getSafeDocNumLimit(limit);
  const rows = await grpoRepository.findDocNums(db, search, safeLimit);
  return rows.map((row: DynRow) => row.docNum);
};

export const previewNextDocNum = () => previewNextDocNumHelper("grpo", "grpo", 50_000);
