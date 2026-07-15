import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getDb } from "@/db/client";
import {
  recalculateParentStatuses,
  validateBaseLinks,
} from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./ar-invoice.queries";
import { arInvoiceRepository } from "./ar-invoice.repository";

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const existing = await arInvoiceRepository.findById(transaction, id);
    if (!existing) {
      throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
    }

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(transaction, payload.lines, payload.cardCode ?? existing.cardCode, id, 13);
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

    const oldLines = await arInvoiceRepository.findLineBaseEntries(transaction, id);

    const oldSoEntries = new Set<number>();
    for (const line of oldLines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 17 && baseEntry) {
        oldSoEntries.add(baseEntry);
      }
    }

    await arInvoiceRepository.updateHeader(transaction, id, {
      address: payload.address ?? undefined,
      address2: payload.address2 ?? undefined,
      canceled: "N",
      comments: payload.comments,
      docCurrency: payload.docCurrency,
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? undefined,
      docStatus: updatedDocStatus,
      docTotal: String(lineTotal),
      numAtCard: payload.numAtCard ?? undefined,
    });

    if (payload.lines) {
      await arInvoiceRepository.deleteLines(transaction, id);
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
          docEntry: id,
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

      if (!isDraft) {
        const newSoEntries = new Set<number>();
        for (const line of payload.lines) {
          const baseType = Number(line.baseType);
          const baseEntry = Number(line.baseEntry);
          if (baseType === 17 && baseEntry) {
            newSoEntries.add(baseEntry);
          }
        }

        const allSoEntries = new Set<number>([...oldSoEntries, ...newSoEntries]);

        if (allSoEntries.size > 0) {
          await recalculateParentStatuses(transaction, allSoEntries, 17);
        }
      }
    }
    logger.info({ docNum: existing.docNum, id }, "AR Invoice updated");
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const existing = await arInvoiceRepository.findById(transaction, id);
    if (!existing) {
      throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
    }
    await arInvoiceRepository.updateHeader(transaction, id, {
      canceled: "Y",
      docStatus: "C",
    });

    const lines = await arInvoiceRepository.findLineBaseEntries(transaction, id);

    const soEntries = new Set<number>();
    for (const line of lines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 17 && baseEntry) {
        soEntries.add(baseEntry);
      }
    }
    if (soEntries.size > 0) {
      await recalculateParentStatuses(transaction, soEntries, 17);
    }

    logger.info({ docNum: existing.docNum, id }, "AR Invoice cancelled");
    return getById(id);
  });
};

export const reopen = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const existing = await arInvoiceRepository.findById(transaction, id);
    if (!existing) {
      throw new AppError("AR Invoice not found", 404, "NOT_FOUND");
    }
    await arInvoiceRepository.updateHeader(transaction, id, {
      canceled: "N",
      docStatus: "O",
    });

    const lines = await arInvoiceRepository.findLineBaseEntries(transaction, id);

    const soEntries = new Set<number>();
    for (const line of lines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 17 && baseEntry) {
        soEntries.add(baseEntry);
      }
    }
    if (soEntries.size > 0) {
      await recalculateParentStatuses(transaction, soEntries, 17);
    }

    logger.info({ docNum: existing.docNum, id }, "AR Invoice reopened");
    return getById(id);
  });
};
