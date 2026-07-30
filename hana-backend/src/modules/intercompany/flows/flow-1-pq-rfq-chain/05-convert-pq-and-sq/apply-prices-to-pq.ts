import type { IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

const toFinite = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Map RFQ seller-filled commercial fields onto SAP DocumentLines shape for the buyer PQ.
 * Must include qty / price / disc% / tax so SL PATCH (replace collection) does not zero totals.
 */
export const buildRfqCommercialDocumentLines = (lines: IcRfqLine[]): Record<string, unknown>[] =>
  lines.map((line) => {
    const quantity = toFinite(line.quantity, 0);
    const unitPrice = line.unitPrice == null ? 0 : toFinite(line.unitPrice, 0);
    const discount = line.discount == null ? 0 : toFinite(line.discount, 0);
    const requiredQtyRaw =
      line.requiredQuantity != null && Number(line.requiredQuantity) > 0
        ? toFinite(line.requiredQuantity, quantity)
        : quantity;

    const docLine: Record<string, unknown> = {
      DiscountPercent: discount,
      ItemCode: line.itemCode,
      LineNum: line.lineNum,
      Quantity: quantity,
      RequiredQuantity: requiredQtyRaw,
      UnitPrice: unitPrice,
    };

    const tax = line.taxCode?.trim();
    if (tax) {
      // Buyer PQ keeps buyer purchase tax (RFQ tax snapshot from original PQ).
      docLine.VatGroup = tax;
    }

    if (line.warehouse?.trim()) {
      docLine.WarehouseCode = line.warehouse.trim();
    }

    if (line.uomCode?.trim()) {
      docLine.UoMCode = line.uomCode.trim();
      docLine.UseBaseUnit = "tNO";
    }

    if (line.deliveryDate) {
      docLine.ShipDate = line.deliveryDate;
    }

    if (line.requiredDate) {
      docLine.ReqDate = line.requiredDate;
    } else if (line.deliveryDate) {
      docLine.ReqDate = line.deliveryDate;
    }

    if (line.description?.trim()) {
      docLine.ItemDescription = line.description.trim();
    }

    return docLine;
  });

/** Patch buyer PQ lines with RFQ qty / price / disc / tax / delivery (update existing PQ). */
export const applyPricesToPq = async (params: {
  documents: IcSlDocuments;
  buyerCompanyId: number;
  /** Real PurchaseQuotations DocEntry. */
  draftEntry: number;
  lines: IcRfqLine[];
  /** Merged Comments (existing user text + IC chain lines). */
  comments?: string | null;
}): Promise<void> => {
  const documentLines = buildRfqCommercialDocumentLines(params.lines);

  await params.documents.applyPricesToPq({
    comments: params.comments,
    companyId: params.buyerCompanyId,
    documentLines,
    draftEntry: params.draftEntry,
  });
};
