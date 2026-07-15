import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getDb } from "@/db/client";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import {
  recalculateParentStatuses,
  validateBaseLinks,
} from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./ar-credit-memo.queries";
import { arCreditMemoRepository } from "./ar-credit-memo.repository";

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
      const existing = await arCreditMemoRepository.findById(transaction, draftDocEntry);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = payload.docNum;

      await arCreditMemoRepository.updateHeader(transaction, draftDocEntry, {
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
      });

      await arCreditMemoRepository.deleteLines(transaction, draftDocEntry);
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum;

      const header = await arCreditMemoRepository.insertHeader(transaction, {
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
      });
      headerId = header.id;
    }

    if (payload.lines?.length) {
      await arCreditMemoRepository.insertLines(
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
        })),
      );
    }

    if (!isDraft) {
      const invoiceEntries = new Set<number>();
      for (const line of payload.lines) {
        const baseType = Number(line.baseType);
        const baseEntry = Number(line.baseEntry);
        if (baseType === 13 && baseEntry) {
          invoiceEntries.add(baseEntry);
        }
      }
      if (invoiceEntries.size > 0) {
        await recalculateParentStatuses(transaction, invoiceEntries, 13);
      }
    }

    logger.info({ docNum: payload.docNum }, "AR Credit memo created");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const existing = await arCreditMemoRepository.findById(transaction, id);
    if (!existing) {
      throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
    }

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(transaction, payload.lines, payload.cardCode ?? existing.cardCode, id, 16);
    }

    const updatedDocStatus =
      payload.isDraft === true ? "D" : existing.docStatus === "D" ? "O" : existing.docStatus;
    const lineTotal = payload.lines
      ? payload.lines.reduce(
          (runningTotal: number, line: DynRow) =>
            runningTotal + (line.unitPrice ?? 0) * line.quantity,
          0,
        )
      : Number(existing.docTotal);

    const oldLines = await arCreditMemoRepository.findLineBaseEntries(transaction, id);

    const oldInvoiceEntries = new Set<number>();
    for (const line of oldLines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 13 && baseEntry) {
        oldInvoiceEntries.add(baseEntry);
      }
    }

    await arCreditMemoRepository.updateHeader(transaction, id, {
      address: payload.address ?? undefined,
      address2: payload.address2 ?? undefined,
      canceled: "N",
      comments: payload.comments,
      docCurrency: payload.docCurrency,
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? undefined,
      docStatus: updatedDocStatus,
      docTotal: String(lineTotal),
    });

    if (payload.lines) {
      await arCreditMemoRepository.deleteLines(transaction, id);
      await arCreditMemoRepository.insertLines(
        transaction,
        payload.lines.map((line: DynRow, lineIndex: number) => ({
          baseEntry: line.baseEntry ?? null,
          baseLine: line.baseLine ?? null,
          baseQuantity:
            line.baseQuantity === null || line.baseQuantity === undefined
              ? null
              : String(line.baseQuantity),
          baseType: line.baseType ?? null,
          docEntry: id,
          itemCode: line.itemCode,
          itemDescription: line.itemDescription ?? null,
          lineNum: line.lineNum !== undefined && line.lineNum !== null ? line.lineNum : lineIndex,
          lineTotal: String((line.unitPrice ?? 0) * line.quantity),
          quantity: String(line.quantity),
          unitPrice:
            line.unitPrice === null || line.unitPrice === undefined ? null : String(line.unitPrice),
        })),
      );

      if (!isDraft) {
        const newInvoiceEntries = new Set<number>();
        for (const line of payload.lines) {
          const baseType = Number(line.baseType);
          const baseEntry = Number(line.baseEntry);
          if (baseType === 13 && baseEntry) {
            newInvoiceEntries.add(baseEntry);
          }
        }

        const allInvoiceEntries = new Set<number>([...oldInvoiceEntries, ...newInvoiceEntries]);

        if (allInvoiceEntries.size > 0) {
          await recalculateParentStatuses(transaction, allInvoiceEntries, 13);
        }
      }
    }
    logger.info({ docNum: existing.docNum, id }, "AR Credit memo updated");
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const existing = await arCreditMemoRepository.findById(transaction, id);
    if (!existing) {
      throw new AppError("AR Credit memo not found", 404, "NOT_FOUND");
    }
    await arCreditMemoRepository.updateHeader(transaction, id, {
      canceled: "Y",
      docStatus: "C",
    });

    const lines = await arCreditMemoRepository.findLineBaseEntries(transaction, id);

    const invoiceEntries = new Set<number>();
    for (const line of lines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 13 && baseEntry) {
        invoiceEntries.add(baseEntry);
      }
    }
    if (invoiceEntries.size > 0) {
      await recalculateParentStatuses(transaction, invoiceEntries, 13);
    }

    logger.info({ docNum: existing.docNum, id }, "AR Credit memo cancelled");
    return getById(id);
  });
};
