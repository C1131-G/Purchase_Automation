export interface PurchaseOrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PurchaseOrderDocNumLookupQuery {
  search?: string;
  limit?: number;
}
