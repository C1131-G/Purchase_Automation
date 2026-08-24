import type { IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

const toFinite = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Map RFQ seller-filled commercial fields onto SAP DocumentLines for the buyer PQ PATCH.
 *
 * Only commercial fields (matched by LineNum onto existing PQ lines):
 *   Quantity, UnitPrice, DiscountPercent, ShipDate (quoted date), ReqDate (required date).
 *
 * Never send ItemCode, ItemDescription, tax, WH, UoM, BPL — buyer PQ keeps original
 * item master code/description (and other non-commercial line data) from GET.
 * RFQ ItemCode may be partner OSCN.Substitute; overwriting causes SL 404 -2028.
 * Disc amount in SAP follows DiscountPercent on the line (no separate RFQ field).
 */
export const buildRfqCommercialDocumentLines = (lines: IcRfqLine[]): Record<string, unknown>[] =>
  lines.map((line) => {
    const quantity = toFinite(line.quantity, 0);
    const unitPrice = line.unitPrice == null ? 0 : toFinite(line.unitPrice, 0);
    const discount = line.discount == null ? 0 : toFinite(line.discount, 0);

    const docLine: Record<string, unknown> = {
      DiscountPercent: discount,
      LineNum: line.lineNum,
      Quantity: quantity,
      UnitPrice: unitPrice,
    };

    const quotedDate = line.deliveryDate?.trim() || "";
    if (quotedDate) {
      docLine.ShipDate = quotedDate;
    }

    // Retain the existing PQ required date when neither RFQ date is available.
    const requiredDate = line.requiredDate?.trim() || line.deliveryDate?.trim() || "";
    if (requiredDate) {
      docLine.ReqDate = requiredDate;
    }

    return docLine;
  });

/** Seller SQ PATCH — same commercials, no ReqDate (PQ required date stays on buyer). */
export const buildRfqCommercialSqDocumentLines = (lines: IcRfqLine[]): Record<string, unknown>[] =>
  lines.map((line) => {
    const quantity = toFinite(line.quantity, 0);
    const unitPrice = line.unitPrice == null ? 0 : toFinite(line.unitPrice, 0);
    const discount = line.discount == null ? 0 : toFinite(line.discount, 0);
    const docLine: Record<string, unknown> = {
      DiscountPercent: discount,
      LineNum: line.lineNum,
      Quantity: quantity,
      UnitPrice: unitPrice,
    };
    const quotedDate = line.deliveryDate?.trim() || "";
    if (quotedDate) {
      docLine.ShipDate = quotedDate;
    }
    return docLine;
  });

/** Patch buyer PQ lines with RFQ qty / price / disc% / quoted date / required date only. */
export const applyPricesToPq = async (params: {
  documents: IcSlDocuments;
  buyerCompanyId: number;
  /** Real PurchaseQuotations DocEntry. */
  draftEntry: number;
  lines: IcRfqLine[];
  /** Merged Comments (existing user text + IC chain lines). */
  comments?: string | null;
  /** Conversion retains only the RFQ line set on the buyer PQ. */
  replaceDocumentLines?: boolean;
}): Promise<void> => {
  const documentLines = buildRfqCommercialDocumentLines(params.lines);

  await params.documents.applyPricesToPq({
    comments: params.comments,
    companyId: params.buyerCompanyId,
    documentLines,
    draftEntry: params.draftEntry,
    replaceDocumentLines: params.replaceDocumentLines,
  });
};
