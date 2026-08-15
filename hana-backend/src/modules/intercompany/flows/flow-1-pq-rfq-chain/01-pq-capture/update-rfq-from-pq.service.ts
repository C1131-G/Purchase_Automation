import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";

export type UpdateRfqFromPqService = {
  update: (input: { rfqId: number; purchaseQuotation: IcPqDraftHookInput }) => Promise<void>;
};

const numberOr = (value: unknown, fallback: number): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

/** Mirrors buyer commercial fields into an existing seller-editable RFQ only. */
export const createUpdateRfqFromPqService = (deps?: {
  rfq?: RfqService;
}): UpdateRfqFromPqService => {
  const rfq = deps?.rfq ?? createRfqService();
  return {
    update: async ({ rfqId, purchaseQuotation }) => {
      const existing = await rfq.getById(rfqId);
      if (!existing || existing.status !== "DRAFT") {
        return;
      }
      const existingByLine = new Map((existing.lines ?? []).map((line) => [line.lineNum, line]));
      const updates = (purchaseQuotation.lines ?? []).flatMap((line, index) => {
        const lineNum = numberOr(line.LineNum, index);
        const target = existingByLine.get(lineNum);
        if (!target) {
          return [];
        }
        const taxRaw = line.VatGroup ?? line.TaxCode ?? line.taxCode ?? null;
        const taxCode = taxRaw == null ? null : String(taxRaw).trim() || null;
        const quotedQty = numberOr(line.Quantity, Number.NaN);
        const unitPriceRaw = numberOr(line.UnitPrice ?? line.Price, Number.NaN);
        const shipDate = String(line.ShipDate ?? line.QuotedDate ?? line.quotedDate ?? "").trim();
        return [
          {
            deliveryDate: shipDate || null,
            discount: numberOr(line.DiscountPercent, target.discount ?? 0),
            lineNum,
            // Buyer PQ quoted qty stays 0 until seller RFQ fill — do not wipe RFQ qty.
            quantity: Number.isFinite(quotedQty) && quotedQty > 0 ? quotedQty : target.quantity,
            taxCode,
            unitPrice:
              Number.isFinite(unitPriceRaw) && unitPriceRaw > 0
                ? unitPriceRaw
                : (target.unitPrice ?? 0),
          },
        ];
      });
      if (updates.length > 0) {
        await rfq.updateLines(rfqId, updates);
      }
    },
  };
};
