export interface PurchaseQuotationQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PurchaseQuotationDocNumLookupQuery {
  search?: string;
  limit?: number;
}
