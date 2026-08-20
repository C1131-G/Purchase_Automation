import AppError from "@/core/errors/app-error";
import type { IcRfqLine, UpdateRfqLineInput } from "@/modules/intercompany/domain/rfq/rfq.types";

import type { FillRfqLineInput } from "./fill-rfq.types";

/**
 * Seller (vendor) may edit: unit price, quoted qty, delivery date, discount %.
 * Item code and other buyer snapshot fields stay immutable.
 */
export const sanitizeFillLines = (lines: FillRfqLineInput[]): UpdateRfqLineInput[] => {
  const sanitized: UpdateRfqLineInput[] = [];

  for (const line of lines) {
    if (line.itemCode !== undefined) {
      throw new AppError(
        "RFQ fill may only change unit price, quantity, delivery date, and discount — not item",
        400,
        "IC_RFQ_IMMUTABLE_LINE",
      );
    }

    if (!Number.isFinite(line.lineNum)) {
      throw new AppError("Each RFQ line requires lineNum", 400, "IC_RFQ_INVALID_LINE");
    }

    if (!Number.isFinite(line.unitPrice)) {
      throw new AppError("Each RFQ line requires unitPrice", 400, "IC_RFQ_INVALID_LINE");
    }

    let quantity: number | null = null;
    if (line.quantity !== undefined && line.quantity !== null) {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new AppError("Quoted quantity must be a positive number", 400, "IC_RFQ_INVALID_LINE");
      }
      quantity = qty;
    }

    if (line.discount !== undefined && line.discount !== null) {
      const discount = Number(line.discount);
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        throw new AppError("Discount must be between 0 and 100", 400, "IC_RFQ_INVALID_LINE");
      }
    }

    sanitized.push({
      deliveryDate: line.deliveryDate ?? null,
      discount: line.discount ?? null,
      lineNum: line.lineNum,
      quantity,
      unitPrice: line.unitPrice,
    });
  }

  return sanitized;
};

/** Overlay seller fill patches onto existing RFQ lines by LineNum (no add/remove). */
export const overlayRfqLinePatches = (
  existing: IcRfqLine[],
  patches: UpdateRfqLineInput[],
): IcRfqLine[] => {
  const byLineNum = new Map(patches.map((patch) => [patch.lineNum, patch]));
  return existing.map((line) => {
    const patch = byLineNum.get(line.lineNum);
    if (!patch) {
      return line;
    }
    return {
      ...line,
      deliveryDate: patch.deliveryDate !== undefined ? patch.deliveryDate : line.deliveryDate,
      discount: patch.discount !== undefined ? patch.discount : line.discount,
      quantity: patch.quantity != null ? patch.quantity : line.quantity,
      unitPrice: patch.unitPrice,
    };
  });
};
