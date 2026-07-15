import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getNextDocNum } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./sales-quotation.queries";
import { salesQuotationRepository } from "./sales-quotation.repository";

export const create = async (payload: DynRow) => {
  const db = getDb();
  const isDraft = payload.isDraft === true;
  const { draftDocEntry } = payload;

  if (!isDraft && draftDocEntry && draftDocEntry > 0) {
    const existing = await salesQuotationRepository.findById(db, draftDocEntry);

    if (!existing) {
      throw new AppError("Draft document not found", 404, "NOT_FOUND");
    }

    const docNum = await getNextDocNum("sales_quotations", "sales_quotations", 15_000);
    const lineRunningTotal = payload.lines.reduce(
      (runningTotal: number, line: DynRow) => runningTotal + (line.unitPrice ?? 0) * line.quantity,
      0,
    );

    const cardName = await resolveCardName(payload.cardCode, payload.cardName);

    await salesQuotationRepository.updateHeader(db, draftDocEntry, {
      address: payload.address ?? null,
      address2: payload.address2 ?? null,
      canceled: "N",
      cardCode: payload.cardCode,
      cardName,
      comments: payload.comments ?? null,
      docCurrency: payload.docCurrency ?? null,
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? null,
      docNum,
      docStatus: "O",
      docTotal: String(lineRunningTotal),
      salesPersonCode: payload.salesPersonCode ?? null,
    });

    await salesQuotationRepository.deleteLines(db, draftDocEntry);
    if (payload.lines?.length) {
      await salesQuotationRepository.insertLines(
        db,
        payload.lines.map((line: DynRow, lineIndex: number) => ({
          baseEntry: line.baseEntry ?? null,
          baseLine: line.baseLine ?? null,
          baseQuantity:
            line.baseQuantity === null || line.baseQuantity === undefined
              ? null
              : String(line.baseQuantity),
          baseType: line.baseType ?? null,
          discountPercent:
            line.discountPercent === null || line.discountPercent === undefined
              ? null
              : String(line.discountPercent),
          docEntry: draftDocEntry,
          itemCode: line.itemCode,
          itemDescription: line.itemDescription ?? null,
          lineNum: line.lineNum !== undefined && line.lineNum !== null ? line.lineNum : lineIndex,
          lineTotal: String((line.unitPrice ?? 0) * line.quantity),
          quantity: String(line.quantity),
          unitPrice:
            line.unitPrice === null || line.unitPrice === undefined ? null : String(line.unitPrice),
          uomCode: line.uomCode ?? null,
          vatGroup: line.vatGroup ?? null,
          warehouseCode: line.warehouseCode ?? null,
        })),
      );
    }

    logger.info({ docNum, id: draftDocEntry }, "Draft converted to real Sales quotation");
    return getById(draftDocEntry);
  }

  const docStatus = isDraft ? "D" : "O";
  const docNum = await getNextDocNum("sales_quotations", "sales_quotations", 15_000);
  const lineRunningTotal = payload.lines.reduce(
    (runningTotal: number, line: DynRow) => runningTotal + (line.unitPrice ?? 0) * line.quantity,
    0,
  );

  const cardName = await resolveCardName(payload.cardCode, payload.cardName);

  const header = await salesQuotationRepository.insertHeader(db, {
    address: payload.address ?? null,
    address2: payload.address2 ?? null,
    canceled: "N",
    cardCode: payload.cardCode,
    cardName,
    comments: payload.comments ?? null,
    docCurrency: payload.docCurrency ?? null,
    docDate: payload.docDate,
    docDueDate: payload.docDueDate ?? null,
    docNum,
    docStatus,
    docTotal: String(lineRunningTotal),
    salesPersonCode: payload.salesPersonCode ?? null,
  });

  if (payload.lines?.length) {
    await salesQuotationRepository.insertLines(
      db,
      payload.lines.map((line: DynRow, lineIndex: number) => ({
        baseEntry: line.baseEntry ?? null,
        baseLine: line.baseLine ?? null,
        baseQuantity:
          line.baseQuantity === null || line.baseQuantity === undefined
            ? null
            : String(line.baseQuantity),
        baseType: line.baseType ?? null,
        discountPercent:
          line.discountPercent === null || line.discountPercent === undefined
            ? null
            : String(line.discountPercent),
        docEntry: header.id,
        itemCode: line.itemCode,
        itemDescription: line.itemDescription ?? null,
        lineNum: line.lineNum !== undefined && line.lineNum !== null ? line.lineNum : lineIndex,
        lineTotal: String((line.unitPrice ?? 0) * line.quantity),
        quantity: String(line.quantity),
        unitPrice:
          line.unitPrice === null || line.unitPrice === undefined ? null : String(line.unitPrice),
        uomCode: line.uomCode ?? null,
        vatGroup: line.vatGroup ?? null,
        warehouseCode: line.warehouseCode ?? null,
      })),
    );
  }

  logger.info({ docNum }, "Sales quotation created");
  return getById(header.id);
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  const existing = await salesQuotationRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  }

  const updatedDocStatus = payload.isDraft === true ? "D" : existing.docStatus;
  const lineTotal = payload.lines
    ? payload.lines.reduce(
        (runningTotal: number, line: DynRow) =>
          runningTotal + (line.unitPrice ?? 0) * line.quantity,
        0,
      )
    : Number(existing.docTotal);

  const cardName = await resolveCardName(
    payload.cardCode ?? existing.cardCode,
    payload.cardName === undefined ? existing.cardName : payload.cardName,
  );

  await salesQuotationRepository.updateHeader(db, id, {
    address: payload.address ?? undefined,
    address2: payload.address2 ?? undefined,
    canceled: "N",
    cardName: cardName ?? undefined,
    comments: payload.comments,
    docCurrency: payload.docCurrency,
    docDate: payload.docDate,
    docDueDate: payload.docDueDate ?? undefined,
    docStatus: updatedDocStatus,
    docTotal: String(lineTotal),
    salesPersonCode: payload.salesPersonCode,
  });

  if (payload.lines) {
    await salesQuotationRepository.deleteLines(db, id);
    await salesQuotationRepository.insertLines(
      db,
      payload.lines.map((line: DynRow, lineIndex: number) => ({
        baseEntry: line.baseEntry ?? null,
        baseLine: line.baseLine ?? null,
        baseQuantity:
          line.baseQuantity === null || line.baseQuantity === undefined
            ? null
            : String(line.baseQuantity),
        baseType: line.baseType ?? null,
        discountPercent:
          line.discountPercent === null || line.discountPercent === undefined
            ? null
            : String(line.discountPercent),
        docEntry: id,
        itemCode: line.itemCode,
        itemDescription: line.itemDescription ?? null,
        lineNum: line.lineNum !== undefined && line.lineNum !== null ? line.lineNum : lineIndex,
        lineTotal: String((line.unitPrice ?? 0) * line.quantity),
        quantity: String(line.quantity),
        unitPrice:
          line.unitPrice === null || line.unitPrice === undefined ? null : String(line.unitPrice),
        uomCode: line.uomCode ?? null,
        vatGroup: line.vatGroup ?? null,
        warehouseCode: line.warehouseCode ?? null,
      })),
    );
  }

  logger.info({ docNum: existing.docNum, id }, "Sales quotation updated");
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const existing = await salesQuotationRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Sales quotation not found", 404, "NOT_FOUND");
  }
  await salesQuotationRepository.updateHeader(db, id, {
    canceled: "Y",
    docStatus: "C",
  });
  logger.info({ docNum: existing.docNum, id }, "Sales quotation cancelled");
  return getById(id);
};
