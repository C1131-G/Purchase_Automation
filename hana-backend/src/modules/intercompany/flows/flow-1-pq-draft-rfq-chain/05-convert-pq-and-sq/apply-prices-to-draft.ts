import type { IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

/** Patch buyer PQ draft lines with RFQ unit prices / delivery before convert. */
export const applyPricesToDraft = async (params: {
  documents: IcSlDocuments;
  buyerCompanyId: number;
  draftEntry: number;
  lines: IcRfqLine[];
}): Promise<void> => {
  const documentLines = params.lines.map((line) => {
    const docLine: Record<string, unknown> = {
      LineNum: line.lineNum,
      UnitPrice: line.unitPrice ?? 0,
    };
    if (line.discount != null) {
      docLine.DiscountPercent = line.discount;
    }
    if (line.deliveryDate) {
      docLine.ShipDate = line.deliveryDate;
      docLine.ReqDate = line.deliveryDate;
    }
    return docLine;
  });

  await params.documents.applyPricesToDraft({
    companyId: params.buyerCompanyId,
    documentLines,
    draftEntry: params.draftEntry,
  });
};
