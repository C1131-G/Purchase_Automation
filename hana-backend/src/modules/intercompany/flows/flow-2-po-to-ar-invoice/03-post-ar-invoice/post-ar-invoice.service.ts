import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcSlDocumentResult } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import type { Flow2ArInvoicePayload } from "../flow-2.types";

export type PostArInvoiceService = {
  post: (params: {
    sellerCompanyId: number;
    draftPayload: Flow2ArInvoicePayload;
  }) => Promise<IcSlDocumentResult>;
};

export const createPostArInvoiceService = (deps?: {
  documents?: IcSlDocuments;
}): PostArInvoiceService => {
  const documents = deps?.documents ?? createIcSlDocuments();

  return {
    post: async ({ sellerCompanyId, draftPayload }) =>
      documents.createArInvoiceDraft({
        companyId: sellerCompanyId,
        draftPayload,
      }),
  };
};

export const postArInvoiceService = createPostArInvoiceService();
