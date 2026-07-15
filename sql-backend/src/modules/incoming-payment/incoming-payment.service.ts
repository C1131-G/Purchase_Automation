import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { incomingPayments } from "@/db/schema/incoming-payments";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import type { DynRow } from "@/types/drizzle.types";

import { incomingPaymentRepository } from "./incoming-payment.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    CardCode: incomingPayments.cardCode,
    CardName: incomingPayments.cardName,
    DocDate: incomingPayments.docDate,
    DocNum: incomingPayments.docNum,
    DocTotal: incomingPayments.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(incomingPayments, filters, sortColumns);

  const total = await incomingPaymentRepository.countList(db, where);
  const rows = await incomingPaymentRepository.findList(db, where, orderBy, limit, offset);

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
  const header = await incomingPaymentRepository.findById(db, id);
  if (!header) {
    throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  }
  return { ...header, lines: [] };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const header = await incomingPaymentRepository.findByDocNum(db, docNum);
  if (!header) {
    throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  }
  return { ...header, lines: [] };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await incomingPaymentRepository.findDocNums(db, search, getSafeDocNumLimit(limit));
  return rows;
};

export const create = async (payload: DynRow) => {
  const db = getDb();
  const cardName = await resolveCardName(payload.cardCode, payload.cardName);

  const header = await incomingPaymentRepository.insert(db, {
    cardCode: payload.cardCode,
    cardName,
    counterRef: payload.counterRef ?? null,
    docCurrency: payload.docCurrency ?? null,
    docDate: payload.docDate,
    docNum: payload.docNum,
    docTotal:
      payload.docTotal === null || payload.docTotal === undefined ? null : String(payload.docTotal),
    paymentMode: payload.paymentMode ?? null,
  });

  logger.info({ docNum: payload.docNum }, "Incoming payment created");
  return getById(header.id);
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  const existing = await incomingPaymentRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  }
  const cardName = await resolveCardName(
    payload.cardCode ?? existing.cardCode,
    payload.cardName === undefined ? existing.cardName : payload.cardName,
  );

  await incomingPaymentRepository.update(db, id, {
    cardCode: payload.cardCode,
    cardName: cardName ?? undefined,
    counterRef: payload.counterRef ?? undefined,
    docDate: payload.docDate,
    paymentMode: payload.paymentMode ?? undefined,
  });
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const existing = await incomingPaymentRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Incoming payment not found", 404, "NOT_FOUND");
  }
  await incomingPaymentRepository.delete(db, id);
  logger.info({ id }, "Incoming payment cancelled (deleted)");
  return { id };
};

export const previewNextDocNum = () =>
  previewNextDocNumHelper("incoming_payments", "incoming_payments", 90_000);

export const incomingPaymentService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
