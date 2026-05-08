export interface InvoiceQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface InvoiceDocNumLookupQuery {
  search?: string;
  limit?: number;
}
