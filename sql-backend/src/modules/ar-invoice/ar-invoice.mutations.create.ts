import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getDb } from "@/db/client";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import {
  recalculateParentStatuses,
  validateBaseLinks,
} from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./ar-invoice.queries";
import { arInvoiceRepository } from "./ar-invoice.repository";

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
      (runningTotal: number, line: DynRow) => runningTotal + (line.unitPrice ?? 0) * line.quantity,
      0,
    );

    const cardName = await resolveCardName(payload.cardCode, payload.cardName);

    if (draftDocEntry && draftDocEntry > 0) {
      const existing = await arInvoiceRepository.findById(transaction, draftDocEntry);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = payload.docNum;

      await arInvoiceRepository.updateHeader(transaction, draftDocEntry, {
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
        docStatus: isDraft ? "D" : "O",
        docTotal: String(lineRunningTotal),
        numAtCard: payload.numAtCard ?? null,
      });

      await arInvoiceRepository.deleteLines(transaction, draftDocEntry);
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum;

      const header = await arInvoiceRepository.insertHeader(transaction, {
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
      });
      headerId = header.id;
    }

    if (payload.lines?.length) {
      await arInvoiceRepository.insertLines(
        transaction,
        payload.lines.map((line: DynRow, lineIndex: number) => ({
          baseEntry: line.baseEntry ?? null,
          baseLine: line.baseLine ?? null,
          baseQuantity:
            line.baseQuantity === null || line.baseQuantity === undefined
              ? null
              : String(line.baseQuantity),
          baseType: line.baseType ?? null,
          docEntry: headerId,
          itemCode: line.itemCode,
          itemDescription: line.itemDescription ?? null,
          lineNum: line.lineNum !== undefined && line.lineNum !== null ? line.lineNum : lineIndex,
          lineTotal: String((line.unitPrice ?? 0) * line.quantity),
          quantity: String(line.quantity),
          unitPrice:
            line.unitPrice === null || line.unitPrice === undefined ? null : String(line.unitPrice),
          uomCode: line.uomCode ?? null,
          warehouseCode: line.warehouseCode ?? null,
        })),
      );
    }

    if (!isDraft) {
      const soEntries = new Set<number>();
      for (const line of payload.lines) {
        const baseType = Number(line.baseType);
        const baseEntry = Number(line.baseEntry);
        if (baseType === 17 && baseEntry) {
          soEntries.add(baseEntry);
        }
      }
      if (soEntries.size > 0) {
        await recalculateParentStatuses(transaction, soEntries, 17);
      }
    }

    logger.info({ docNum: payload.docNum }, "AR Invoice created");
    return getById(headerId);
  });
};
