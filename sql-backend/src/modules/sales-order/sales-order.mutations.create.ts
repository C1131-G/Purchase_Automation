import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getNextDocNum } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import { calculateLineTotal } from "@/services/discount.util";
import {
  recalculateParentStatuses,
  validateBaseLinks,
} from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./sales-order.queries";
import { salesOrderRepository } from "./sales-order.repository";

export const create = async (payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const isDraft = payload.isDraft === true;
    const { draftDocEntry } = payload;

    if (!isDraft) {
      await validateBaseLinks(transaction, payload.lines, payload.cardCode);
    }

    let headerId: number;
    let docNum: number;

    const lineRunningTotal = payload.lines.reduce(
      (runningTotal: number, line: DynRow) =>
        runningTotal + calculateLineTotal(line.unitPrice ?? 0, line.quantity, line.discountPercent),
      0,
    );

    const cardName = await resolveCardName(payload.cardCode, payload.cardName);

    if (draftDocEntry && draftDocEntry > 0) {
      const existing = await salesOrderRepository.findById(transaction, draftDocEntry);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = payload.docNum ?? (await getNextDocNum("sales_orders", "sales_orders", 30_000));

      await salesOrderRepository.updateHeader(transaction, draftDocEntry, {
        address: payload.address ?? null,
        address2: payload.address2 ?? null,
        canceled: "N",
        cardCode: payload.cardCode,
        cardName,
        comments: payload.comments ?? null,
        discountPercent: payload.discountPercent ? String(payload.discountPercent) : null,
        docCurrency: payload.docCurrency ?? null,
        docDate: payload.docDate,
        docDueDate: payload.docDueDate ?? null,
        docNum,
        docStatus: isDraft ? "D" : "O",
        docTotal: String(lineRunningTotal),
        numAtCard: payload.numAtCard ?? null,
        salesPersonCode: payload.salesPersonCode ?? null,
      });

      await salesOrderRepository.deleteLines(transaction, draftDocEntry);
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum ?? (await getNextDocNum("sales_orders", "sales_orders", 30_000));

      const header = await salesOrderRepository.insertHeader(transaction, {
        address: payload.address ?? null,
        address2: payload.address2 ?? null,
        canceled: "N",
        cardCode: payload.cardCode,
        cardName,
        comments: payload.comments ?? null,
        discountPercent: payload.discountPercent ? String(payload.discountPercent) : null,
        docCurrency: payload.docCurrency ?? null,
        docDate: payload.docDate,
        docDueDate: payload.docDueDate ?? null,
        docNum,
        docStatus,
        docTotal: String(lineRunningTotal),
        numAtCard: payload.numAtCard ?? null,
        salesPersonCode: payload.salesPersonCode ?? null,
      });
      headerId = header.id;
    }

    if (payload.lines?.length) {
      await salesOrderRepository.insertLines(
        transaction,
        payload.lines.map((line: DynRow, lineIndex: number) =>
          mapLineForInsert(line, headerId, lineIndex),
        ),
      );
    }

    if (!isDraft) {
      const parentDocEntries = new Set<number>(
        payload.lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
      );
      await recalculateParentStatuses(transaction, parentDocEntries, 23);
    }

    logger.info({ docNum }, "Sales Order created");
    return getById(headerId);
  });
};

function mapLineForInsert(line: DynRow, docEntry: number, lineIndex: number) {
  return {
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
    docEntry,
    itemCode: line.itemCode,
    itemDescription: line.itemDescription ?? null,
    lineNum: line.lineNum !== undefined && line.lineNum !== null ? line.lineNum : lineIndex,
    lineTotal: String(calculateLineTotal(line.unitPrice ?? 0, line.quantity, line.discountPercent)),
    quantity: String(line.quantity),
    unitPrice:
      line.unitPrice === null || line.unitPrice === undefined ? null : String(line.unitPrice),
    uomCode: line.uomCode ?? null,
    vatGroup: line.vatGroup ?? null,
    warehouseCode: line.warehouseCode ?? null,
  };
}
