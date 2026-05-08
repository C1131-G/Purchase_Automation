import type { ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";

export interface PagingOptions<T extends ObjectLiteral> {
  query: Repository<T> | SelectQueryBuilder<T>;
  filters?: Record<string, unknown>;
  page?: number;
  limit?: number;
  sort?: Record<string, "ASC" | "DESC">;
  entityName: string;
  dbName: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
