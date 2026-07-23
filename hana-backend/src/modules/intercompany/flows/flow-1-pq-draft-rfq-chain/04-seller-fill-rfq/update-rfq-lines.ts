import AppError from "@/core/errors/app-error";
import type { UpdateRfqLineInput } from "@/modules/intercompany/domain/rfq/rfq.types";

import type { FillRfqLineInput } from "./fill-rfq.types";

/** Only unit price / delivery / discount may change; reject qty or item attempts. */
export const sanitizeFillLines = (lines: FillRfqLineInput[]): UpdateRfqLineInput[] => {
  const sanitized: UpdateRfqLineInput[] = [];

  for (const line of lines) {
    if (line.itemCode !== undefined || line.quantity !== undefined) {
      throw new AppError(
        "RFQ fill may only change unit price, delivery date, and discount — not item or quantity",
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

    sanitized.push({
      deliveryDate: line.deliveryDate ?? null,
      discount: line.discount ?? null,
      lineNum: line.lineNum,
      unitPrice: line.unitPrice,
    });
  }

  return sanitized;
};
