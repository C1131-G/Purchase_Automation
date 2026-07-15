import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getDb } from "@/db/client";
import { resolveCardName } from "@/modules/master-data/master-data.service";
import {
  recalculateParentStatuses,
  validateBaseLinks,
} from "@/services/document-link/document-link";
import type { DynRow } from "@/types/drizzle.types";

import { getById } from "./ap-invoice.queries";
import { apInvoiceRepository } from "./ap-invoice.repository";

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
      (runningTotal: number, line: DynRow) => runningTotal + (line.unitPrice ?? 0) * line.quantity,
      0,
    );

    const cardName = await resolveCardName(payload.cardCode, payload.cardName);

    if (draftDocEntry && draftDocEntry > 0) {
      const existing = await apInvoiceRepository.findById(tx, draftDocEntry);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = payload.docNum;

      await apInvoiceRepository.updateHeader(tx, draftDocEntry, {
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

      await apInvoiceRepository.deleteLines(tx, draftDocEntry);
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum;

      const header = await apInvoiceRepository.insertHeader(tx, {
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
      await apInvoiceRepository.insertLines(
        tx,
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
      const poEntries = new Set<number>();
      const grpoEntries = new Set<number>();
      for (const line of payload.lines) {
        const baseType = Number(line.baseType);
        const baseEntry = Number(line.baseEntry);
        if (baseType === 22 && baseEntry) {
          poEntries.add(baseEntry);
        }
        if (baseType === 20 && baseEntry) {
          grpoEntries.add(baseEntry);
        }
      }
      if (poEntries.size > 0) {
        await recalculateParentStatuses(tx, poEntries, 22);
      }
      if (grpoEntries.size > 0) {
        await recalculateParentStatuses(tx, grpoEntries, 20);
      }
    }

    logger.info({ docNum: payload.docNum }, "AP Invoice created");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const existing = await apInvoiceRepository.findById(tx, id);
    if (!existing) {
      throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
    }

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode ?? existing.cardCode, id, 18);
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

    const oldLines = await apInvoiceRepository.findLineBaseEntries(tx, id);

    const oldPoEntries = new Set<number>();
    const oldGrpoEntries = new Set<number>();
    for (const line of oldLines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 22 && baseEntry) {
        oldPoEntries.add(baseEntry);
      }
      if (baseType === 20 && baseEntry) {
        oldGrpoEntries.add(baseEntry);
      }
    }

    await apInvoiceRepository.updateHeader(tx, id, {
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
      await apInvoiceRepository.deleteLines(tx, id);
      await apInvoiceRepository.insertLines(
        tx,
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
        const newPoEntries = new Set<number>();
        const newGrpoEntries = new Set<number>();
        for (const line of payload.lines) {
          const baseType = Number(line.baseType);
          const baseEntry = Number(line.baseEntry);
          if (baseType === 22 && baseEntry) {
            newPoEntries.add(baseEntry);
          }
          if (baseType === 20 && baseEntry) {
            newGrpoEntries.add(baseEntry);
          }
        }

        const allPoEntries = new Set<number>([...oldPoEntries, ...newPoEntries]);
        const allGrpoEntries = new Set<number>([...oldGrpoEntries, ...newGrpoEntries]);

        if (allPoEntries.size > 0) {
          await recalculateParentStatuses(tx, allPoEntries, 22);
        }
        if (allGrpoEntries.size > 0) {
          await recalculateParentStatuses(tx, allGrpoEntries, 20);
        }
      }
    }
    logger.info({ docNum: existing.docNum, id }, "AP Invoice updated");
    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const existing = await apInvoiceRepository.findById(tx, id);
    if (!existing) {
      throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
    }
    await apInvoiceRepository.updateHeader(tx, id, {
      canceled: "Y",
      docStatus: "C",
    });

    const lines = await apInvoiceRepository.findLineBaseEntries(tx, id);

    const poEntries = new Set<number>();
    const grpoEntries = new Set<number>();
    for (const line of lines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 22 && baseEntry) {
        poEntries.add(baseEntry);
      }
      if (baseType === 20 && baseEntry) {
        grpoEntries.add(baseEntry);
      }
    }
    if (poEntries.size > 0) {
      await recalculateParentStatuses(tx, poEntries, 22);
    }
    if (grpoEntries.size > 0) {
      await recalculateParentStatuses(tx, grpoEntries, 20);
    }

    logger.info({ docNum: existing.docNum, id }, "AP Invoice cancelled");
    return getById(id);
  });
};

export const reopen = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const existing = await apInvoiceRepository.findById(tx, id);
    if (!existing) {
      throw new AppError("AP Invoice not found", 404, "NOT_FOUND");
    }
    await apInvoiceRepository.updateHeader(tx, id, {
      canceled: "N",
      docStatus: "O",
    });

    const lines = await apInvoiceRepository.findLineBaseEntries(tx, id);

    const poEntries = new Set<number>();
    const grpoEntries = new Set<number>();
    for (const line of lines) {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      if (baseType === 22 && baseEntry) {
        poEntries.add(baseEntry);
      }
      if (baseType === 20 && baseEntry) {
        grpoEntries.add(baseEntry);
      }
    }
    if (poEntries.size > 0) {
      await recalculateParentStatuses(tx, poEntries, 22);
    }
    if (grpoEntries.size > 0) {
      await recalculateParentStatuses(tx, grpoEntries, 20);
    }

    logger.info({ docNum: existing.docNum, id }, "AP Invoice reopened");
    return getById(id);
  });
};
