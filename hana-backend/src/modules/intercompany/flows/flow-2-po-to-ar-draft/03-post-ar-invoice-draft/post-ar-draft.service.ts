import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcSlDocumentResult } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import type { Flow2ArDraftPayload } from "../flow-2.types";

export type PostArDraftService = {
  post: (params: {
    sellerCompanyId: number;
    draftPayload: Flow2ArDraftPayload;
  }) => Promise<IcSlDocumentResult>;
};

export const createPostArDraftService = (deps?: {
  documents?: IcSlDocuments;
}): PostArDraftService => {
  const documents = deps?.documents ?? createIcSlDocuments();

  return {
    post: async ({ sellerCompanyId, draftPayload }) =>
      documents.createArInvoiceDraft({
        companyId: sellerCompanyId,
        draftPayload,
      }),
  };
};

export const postArDraftService = createPostArDraftService();
