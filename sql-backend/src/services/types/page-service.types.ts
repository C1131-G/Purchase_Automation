export interface PageRequest {
  page: number;
  limit: number;
}

export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: PageResponse<T>;
}
