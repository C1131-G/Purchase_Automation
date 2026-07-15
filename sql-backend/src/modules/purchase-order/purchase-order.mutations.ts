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

import { getById } from "./purchase-order.queries";
import { purchaseOrderRepository } from "./purchase-order.repository";

export const create = async (payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const isDraft = payload.isDraft === true;
    const { draftDocEntry } = payload;

    if (!isDraft) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode);
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
      const existing = await purchaseOrderRepository.findById(tx, draftDocEntry);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum =
        payload.docNum ?? (await getNextDocNum("purchase_orders", "purchase_orders", 20_000));

      await purchaseOrderRepository.updateHeader(tx, draftDocEntry, {
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

      await purchaseOrderRepository.deleteLines(tx, draftDocEntry);
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum =
        payload.docNum ?? (await getNextDocNum("purchase_orders", "purchase_orders", 20_000));

      const header = await purchaseOrderRepository.insertHeader(tx, {
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

    if (payload.lines.length > 0) {
      await purchaseOrderRepository.insertLines(
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
          docEntry: headerId,
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
    }

    if (!isDraft) {
      const parentDocEntries = new Set<number>(
        payload.lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
      );
      await recalculateParentStatuses(tx, parentDocEntries, 540_000_006);
    }

    logger.info({ docNum }, "Purchase order created");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const existing = await purchaseOrderRepository.findById(tx, id);

    if (!existing) {
      throw new AppError("Purchase order not found", 404, "NOT_FOUND");
    }

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode ?? existing.cardCode, id, 22);
    }

    const updatedDocStatus =
      payload.isDraft === true ? "D" : existing.docStatus === "D" ? "O" : existing.docStatus;

    const cardName = await resolveCardName(
      payload.cardCode ?? existing.cardCode,
      payload.cardName === undefined ? existing.cardName : payload.cardName,
    );

    const oldLines = await purchaseOrderRepository.findLineBaseEntries(tx, id);
    const oldParentEntries = new Set<number>(
      oldLines.map((line: DynRow) => line.baseEntry).filter(Boolean),
    );

    const lineTotal = payload.lines
      ? payload.lines.reduce(
          (runningTotal: number, line: DynRow) =>
            runningTotal +
            calculateLineTotal(line.unitPrice ?? 0, line.quantity, line.discountPercent),
          0,
        )
      : Number(existing.docTotal);

    await purchaseOrderRepository.updateHeader(tx, id, {
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
      await purchaseOrderRepository.deleteLines(tx, id);

      await purchaseOrderRepository.insertLines(
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
        await recalculateParentStatuses(tx, allParentEntries, 540_000_006);
      }
    }

    logger.info({ docNum: existing.docNum, id }, "Purchase order updated");
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const existing = await purchaseOrderRepository.findById(tx, id);

    if (!existing) {
      throw new AppError("Purchase order not found", 404, "NOT_FOUND");
    }

    await purchaseOrderRepository.updateHeader(tx, id, {
      canceled: "Y",
      docStatus: "C",
    });

    const lines = await purchaseOrderRepository.findLineBaseEntries(tx, id);
    const parentEntries = new Set<number>(
      lines.map((line: DynRow) => line.baseEntry).filter(Boolean),
    );
    await recalculateParentStatuses(tx, parentEntries, 540_000_006);

    logger.info({ docNum: existing.docNum, id }, "Purchase order cancelled");
    return getById(id);
  });
};
