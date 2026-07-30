import type { IcSlDocumentResult } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

export const updateBuyerPq = async (params: {
  documents: IcSlDocuments;
  buyerCompanyId: number;
  draftEntry: number;
  /** Merged Comments for posted PQ (preserves user text + IC chain). */
  comments?: string | null;
  /**
   * RFQ commercial DocumentLines (qty / price / disc% / tax) merged onto draft before POST.
   */
  lineOverrides?: Record<string, unknown>[];
}): Promise<IcSlDocumentResult> =>
  params.documents.convertDraftToDocument({
    comments: params.comments,
    companyId: params.buyerCompanyId,
    draftEntry: params.draftEntry,
    lineOverrides: params.lineOverrides,
  });
