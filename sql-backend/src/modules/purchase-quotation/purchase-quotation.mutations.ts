import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getNextDocNum } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./purchase-quotation.queries";
import { purchaseQuotationRepository } from "./purchase-quotation.repository";

export const create = async (payload: DynRow) => {
  const db = getDb();
  const isDraft = payload.isDraft === true;
  const { draftDocEntry } = payload;

  if (!isDraft && draftDocEntry && draftDocEntry > 0) {
    const existing = await purchaseQuotationRepository.findById(db, draftDocEntry);

    if (!existing) {
      throw new AppError("Draft document not found", 404, "NOT_FOUND");
    }

    const docNum = await getNextDocNum("purchase_quotations", "purchase_quotations", 10_000);
    const lineRunningTotal = payload.lines.reduce(
      (runningTotal: number, line: DynRow) => runningTotal + (line.unitPrice ?? 0) * line.quantity,
      0,
    );

    const cardName = await resolveCardName(payload.cardCode, payload.cardName);

    await purchaseQuotationRepository.updateHeader(db, draftDocEntry, {
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
      numAtCard: payload.numAtCard ?? null,
      salesPersonCode: payload.salesPersonCode ?? null,
    });

    await purchaseQuotationRepository.deleteLines(db, draftDocEntry);
    if (payload.lines?.length) {
      await purchaseQuotationRepository.insertLines(
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

    logger.info({ docNum, id: draftDocEntry }, "Draft converted to real Purchase quotation");
    return getById(draftDocEntry);
  }

  const docStatus = isDraft ? "D" : "O";
  const docNum = await getNextDocNum("purchase_quotations", "purchase_quotations", 10_000);
  const lineRunningTotal = payload.lines.reduce(
    (runningTotal: number, line: DynRow) => runningTotal + (line.unitPrice ?? 0) * line.quantity,
    0,
  );

  const cardName = await resolveCardName(payload.cardCode, payload.cardName);

  const header = await purchaseQuotationRepository.insertHeader(db, {
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
    numAtCard: payload.numAtCard ?? null,
    salesPersonCode: payload.salesPersonCode ?? null,
  });

  if (payload.lines?.length) {
    await purchaseQuotationRepository.insertLines(
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

  logger.info({ docNum }, "Purchase quotation created");
  return getById(header.id);
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  const existing = await purchaseQuotationRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");
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

  await purchaseQuotationRepository.updateHeader(db, id, {
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
    numAtCard: payload.numAtCard ?? undefined,
    salesPersonCode: payload.salesPersonCode,
  });

  if (payload.lines) {
    await purchaseQuotationRepository.deleteLines(db, id);
    await purchaseQuotationRepository.insertLines(
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

  logger.info({ docNum: existing.docNum, id }, "Purchase quotation updated");
  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const existing = await purchaseQuotationRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Purchase quotation not found", 404, "NOT_FOUND");
  }
  await purchaseQuotationRepository.updateHeader(db, id, {
    canceled: "Y",
    docStatus: "C",
  });
  logger.info({ docNum: existing.docNum, id }, "Purchase quotation cancelled");
  return getById(id);
};
