import type { IcSlDocumentResult } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

export const convertDraftToPq = async (params: {
  documents: IcSlDocuments;
  buyerCompanyId: number;
  draftEntry: number;
}): Promise<IcSlDocumentResult> =>
  params.documents.convertDraftToDocument({
    companyId: params.buyerCompanyId,
    draftEntry: params.draftEntry,
  });
