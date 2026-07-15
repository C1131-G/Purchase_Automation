import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getNextDocNum } from "@/core/utils/series.util";
import { getDb } from "@/db/client";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import {
  recalculateParentStatuses,
  validateBaseLinks,
} from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./grpo.queries";
import { grpoRepository } from "./grpo.repository";

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
      const existing = await grpoRepository.findById(transaction, draftDocEntry);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = await getNextDocNum("grpo", "grpo", 50_000);

      await grpoRepository.updateHeader(transaction, draftDocEntry, {
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

      await grpoRepository.deleteLines(transaction, draftDocEntry);
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = await getNextDocNum("grpo", "grpo", 50_000);

      const header = await grpoRepository.insertHeader(transaction, {
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
      await grpoRepository.insertLines(
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
      const parentDocEntries = new Set<number>(
        payload.lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
      );
      await recalculateParentStatuses(transaction, parentDocEntries, 22);
    }

    logger.info({ docNum, id: headerId }, "GRPO processed");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const existing = await grpoRepository.findById(transaction, id);
    if (!existing) {
      throw new AppError("GRPO not found", 404, "NOT_FOUND");
    }

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(transaction, payload.lines, payload.cardCode ?? existing.cardCode, id, 20);
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

    const oldLines = await grpoRepository.findLineBaseEntries(transaction, id);
    const oldParentEntries = new Set<number>(
      oldLines.map((line: DynRow) => line.baseEntry).filter(Boolean),
    );

    await grpoRepository.updateHeader(transaction, id, {
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
      await grpoRepository.deleteLines(transaction, id);
      await grpoRepository.insertLines(
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
        const newParentEntries = new Set<number>(
          payload.lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
        );
        const allParentEntries = new Set<number>([...oldParentEntries, ...newParentEntries]);
        await recalculateParentStatuses(transaction, allParentEntries, 22);
      }
    }

    logger.info({ docNum: existing.docNum, id }, "GRPO updated");
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (transaction) => {
    const existing = await grpoRepository.findById(transaction, id);
    if (!existing) {
      throw new AppError("GRPO not found", 404, "NOT_FOUND");
    }
    await grpoRepository.updateHeader(transaction, id, {
      canceled: "Y",
      docStatus: "C",
    });

    const lines = await grpoRepository.findLineBaseEntries(transaction, id);
    const parentEntries = new Set<number>(
      lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
    );
    await recalculateParentStatuses(transaction, parentEntries, 22);

    logger.info({ docNum: existing.docNum, id }, "GRPO cancelled");
    return getById(id);
  });
};
