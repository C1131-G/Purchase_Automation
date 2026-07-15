import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
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

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const existing = await salesOrderRepository.findById(tx, id);
    if (!existing) {
      throw new AppError("Sales order not found", 404, "NOT_FOUND");
    }

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode ?? existing.cardCode, id, 17);
    }

    const updatedDocStatus =
      payload.isDraft === true ? "D" : existing.docStatus === "D" ? "O" : existing.docStatus;
    const lineTotal = payload.lines
      ? payload.lines.reduce(
          (runningTotal: number, line: DynRow) =>
            runningTotal +
            calculateLineTotal(line.unitPrice ?? 0, line.quantity, line.discountPercent),
          0,
        )
      : Number(existing.docTotal);

    const cardName = await resolveCardName(
      payload.cardCode ?? existing.cardCode,
      payload.cardName === undefined ? existing.cardName : payload.cardName,
    );

    const oldLines = await salesOrderRepository.findLineBaseEntries(tx, id);
    const oldParentEntries = new Set<number>(
      oldLines.map((line: DynRow) => line.baseEntry).filter(Boolean),
    );

    await salesOrderRepository.updateHeader(tx, id, {
      address: payload.address ?? undefined,
      address2: payload.address2 ?? undefined,
      canceled: "N",
      cardCode: payload.cardCode ?? undefined,
      cardName: cardName ?? undefined,
      comments: payload.comments ?? undefined,
      discountPercent:
        payload.discountPercent === null || payload.discountPercent === undefined
          ? undefined
          : String(payload.discountPercent),
      docCurrency: payload.docCurrency ?? undefined,
      docDate: payload.docDate,
      docDueDate: payload.docDueDate ?? undefined,
      docStatus: updatedDocStatus,
      docTotal: String(lineTotal),
      numAtCard: payload.numAtCard ?? undefined,
      salesPersonCode: payload.salesPersonCode ?? undefined,
    });

    if (payload.lines) {
      await salesOrderRepository.deleteLines(tx, id);
      await salesOrderRepository.insertLines(
        tx,
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
          lineTotal: String(
            calculateLineTotal(line.unitPrice ?? 0, line.quantity, line.discountPercent),
          ),
          quantity: String(line.quantity),
          unitPrice:
            line.unitPrice === null || line.unitPrice === undefined ? null : String(line.unitPrice),
          uomCode: line.uomCode ?? null,
          vatGroup: line.vatGroup ?? null,
          warehouseCode: line.warehouseCode ?? null,
        })),
      );

      if (!isDraft) {
        const newParentEntries = new Set<number>(
          payload.lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
        );
        const allParentEntries = new Set<number>([...oldParentEntries, ...newParentEntries]);
        await recalculateParentStatuses(tx, allParentEntries, 23);
      }
    }

    logger.info({ docNum: existing.docNum, id }, "Sales Order updated");
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const existing = await salesOrderRepository.findById(tx, id);
    if (!existing) {
      throw new AppError("Sales order not found", 404, "NOT_FOUND");
    }
    await salesOrderRepository.updateHeader(tx, id, {
      canceled: "Y",
      docStatus: "C",
    });

    const lines = await salesOrderRepository.findLineBaseEntries(tx, id);
    const parentEntries = new Set<number>(
      lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
    );
    await recalculateParentStatuses(tx, parentEntries, 23);

    logger.info({ docNum: existing.docNum, id }, "Sales Order cancelled");
    return getById(id);
  });
};
