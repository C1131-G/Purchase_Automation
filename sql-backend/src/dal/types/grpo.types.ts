export interface GRPOQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface GRPODocNumLookupQuery {
  search?: string;
  limit?: number;
}

export interface AvailablePOsQuery {
  search?: string;
  limit?: number;
}
