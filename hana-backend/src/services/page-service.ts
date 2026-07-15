// Generic Page Service: Centralized utility for handling server-side pagination, dynamic sorting, and metadata calculation across the application.

import type {
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import type { PagedResult, PagingOptions } from "@/services/types/page-service.types";

// Executes a paged retrieval operation, supporting both TypeORM Repository and SelectQueryBuilder.
export const getPagedData = async <T extends ObjectLiteral>({
  query,
  filters = {},
  page = 1,
  limit = 10,
  sort = {},
  entityName,
  dbName,
}: PagingOptions<T>): Promise<PagedResult<T>> => {
  const startTime = Date.now();
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let total: number;
    let data: T[];

    // Detects whether the provided query is a TypeORM QueryBuilder or a standard Repository.
    const isQueryBuilder = typeof (query as SelectQueryBuilder<T>).getQuery === "function";

    if (isQueryBuilder) {
      const qb = query as SelectQueryBuilder<T>;

      // Applies dynamic sorting directions to the query builder.
      Object.entries(sort).forEach(([field, direction]) => {
        qb.addOrderBy(field, direction);
      });

      // skip() and take() leverage the database platform's native OFFSET/FETCH syntax (e.g., HANA's LIMIT).
      qb.skip(offset).take(Number(limit));

      // Executes a single transaction that retrieves both the data window and the total record count.
      [data, total] = await qb.getManyAndCount();
    } else {
      const repo = query as Repository<T>;
      // For basic repository-based find operations.
      const findOptions = {
        order: sort as FindOptionsOrder<T>,
        skip: offset,
        take: Number(limit),
        where: filters as FindOptionsWhere<T>,
      };

      [data, total] = await repo.findAndCount(findOptions);
    }

    const duration = Date.now() - startTime;
    const totalPages = Math.ceil(total / Number(limit));

    // Structured logging for performance monitoring and debugging query execution times.
    logger.info({
      db: dbName,
      duration: `${duration}ms`,
      entity: entityName,
      filters,
      msg: `${entityName} paged data fetched`,
      pagination: {
        limit,
        page,
        total,
        totalPages,
      },
    });

    return {
      data,
      limit: Number(limit),
      page: Number(page),
      total,
      totalPages,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      entity: entityName,
      err: caughtError,
      filters,
      msg: "Pagination query failed",
      stack: caughtError.stack,
    });
    const serviceError = new Error(
      `Failed to retrieve ${entityName} data: ${caughtError.message}`,
    ) as Error & { statusCode?: number };
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

export const PageService = {
  getPagedData,
};
