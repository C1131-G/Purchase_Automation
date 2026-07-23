/**
 * Partner SAP document helpers via IC Service Layer.
 * Stubs until P5 (AR draft) / P6 (SQ + convert).
 */

export type CreateArInvoiceDraftInput = {
  companyId: number;
  cardCode: string;
  lines: unknown[];
  remarks?: string;
};

export type CreateSalesQuotationInput = {
  companyId: number;
  cardCode: string;
  lines: unknown[];
  remarks?: string;
};

export type IcSlDocumentResult = {
  docEntry: number;
  docNum?: number;
};

export const createIcSlDocuments = () => ({
  createArInvoiceDraft: async (_input: CreateArInvoiceDraftInput): Promise<IcSlDocumentResult> => {
    throw new Error("Not implemented: createArInvoiceDraft (P5)");
  },

  createSalesQuotation: async (_input: CreateSalesQuotationInput): Promise<IcSlDocumentResult> => {
    throw new Error("Not implemented: createSalesQuotation (P6)");
  },

  convertDraftToDocument: async (_params: {
    companyId: number;
    draftEntry: number;
  }): Promise<IcSlDocumentResult> => {
    throw new Error("Not implemented: convertDraftToDocument (P6)");
  },
});

export const icSlDocuments = createIcSlDocuments();
