export interface SalesOrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface SalesOrderDocNumLookupQuery {
  search?: string;
  limit?: number;
}
