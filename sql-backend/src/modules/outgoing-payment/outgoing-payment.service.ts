import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { outgoingPayments } from "@/db/schema/outgoing-payments";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import type { DynRow } from "@/types/drizzle.types";

import { outgoingPaymentRepository } from "./outgoing-payment.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: outgoingPayments.cardCode,
    CardName: outgoingPayments.cardName,
    DocDate: outgoingPayments.docDate,
    DocNum: outgoingPayments.docNum,
    DocTotal: outgoingPayments.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(outgoingPayments, filters, sortColumns);

  const total = await outgoingPaymentRepository.countList(db, where);
  const rows = await outgoingPaymentRepository.findList(db, where, orderBy, limit, offset);

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
  const h = await outgoingPaymentRepository.findById(db, id);
  if (!h) {
    throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  }
  return { ...h, lines: [] };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const h = await outgoingPaymentRepository.findByDocNum(db, docNum);
  if (!h) {
    throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  }
  return { ...h, lines: [] };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await outgoingPaymentRepository.findDocNums(db, search, getSafeDocNumLimit(limit));
  return rows;
};

export const create = async (payload: DynRow) => {
  const db = getDb();
  const cardName = await resolveCardName(payload.cardCode, payload.cardName);

  const h = await outgoingPaymentRepository.insert(db, {
    cardCode: payload.cardCode,
    cardName,
    docCurrency: payload.docCurrency ?? null,
    docDate: payload.docDate,
    docNum: payload.docNum,
    docTotal:
      payload.docTotal === null || payload.docTotal === undefined ? null : String(payload.docTotal),
    paymentMode: payload.paymentMode ?? null,
  });
  logger.info({ docNum: payload.docNum }, "Outgoing payment created");
  return getById(h.id);
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  const ex = await outgoingPaymentRepository.findById(db, id);
  if (!ex) {
    throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  }
  await outgoingPaymentRepository.update(db, id, { docDate: payload.docDate });
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const ex = await outgoingPaymentRepository.findById(db, id);
  if (!ex) {
    throw new AppError("Outgoing payment not found", 404, "NOT_FOUND");
  }
  await outgoingPaymentRepository.delete(db, id);
  logger.info({ id }, "Outgoing payment cancelled (deleted)");
  return { id };
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("outgoing_payments", "outgoing_payments", 91_000);

export const outgoingPaymentService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
