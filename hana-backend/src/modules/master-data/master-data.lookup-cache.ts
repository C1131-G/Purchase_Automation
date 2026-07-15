// Master Data Service: Centralized logic for retrieving organizational lookup data (Products, Partners, Tax, etc.) from SAP HANA.

import type { EntitySchema, FindManyOptions, ObjectLiteral } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/db/tenant-query";
// Generic helper function that wraps TypeORM repository lookups with a tenant-aware caching layer.
export const fetchLookup = async <T extends ObjectLiteral>(
  dbName: string,
  Schema: EntitySchema<T>,
  entityName: string,
  options: FindManyOptions<T> = {},
): Promise<T[]> => {
  const cacheKey = `master:${dbName}:${entityName}`;

  // Master data changes infrequently in SAP, so a 10-minute cache TTL is used to minimize database load.
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const repository = await getTenantRepository(dbName, Schema);
        const results = await repository.find(options);
        logger.info({
          count: results?.length,
          msg: `Lookups fetched: ${entityName}`,
        });
        return results || [];
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          db: dbName,
          err: caughtError,
          msg: `Failed to fetch ${entityName} from HANA`,
        });
        const dbError = new Error(
          `Failed to retrieve ${entityName}: ${caughtError.message}`,
        ) as Error & {
          statusCode?: number;
        };
        dbError.statusCode = 500;

        throw dbError;
      }
    },
    1000 * 60 * 10,
  );
};

export const toTrimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
export const toNullableInt = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return Math.trunc(parsed);
  }
  return undefined;
};
export const toNumberOrZero = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) {
      return 0;
    }
    const parsedFromString = Number(normalized);
    return Number.isFinite(parsedFromString) ? parsedFromString : 0;
  }
  if (value && typeof value === "object") {
    const rawString = String(value).trim();
    if (rawString && rawString !== "[object Object]") {
      const parsedFromObjectString = Number(rawString);
      if (Number.isFinite(parsedFromObjectString)) {
        return parsedFromObjectString;
      }
    }
    const record = value as Record<string, unknown>;
    const nested = record.value ?? record.Value ?? record.amount ?? record.Amount;
    if (nested !== undefined) {
      return toNumberOrZero(nested);
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
