export interface SalesQuotationQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface SalesQuotationDocNumLookupQuery {
  search?: string;
  limit?: number;
}
