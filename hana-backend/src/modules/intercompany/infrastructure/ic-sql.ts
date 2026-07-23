// Thin SQL port for IC tables (SBOCOMMON). Injectable for unit tests.

import { AppDataSource } from "@/db/config/data-source";

export type IcSqlClient = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ) => Promise<T[]>;
};

/** Production client — TypeORM SAP driver against common schema. */
export const createAppSqlClient = (): IcSqlClient => ({
  query: async <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> => {
    const rows = await AppDataSource.query(sql, params);
    return (rows ?? []) as T[];
  },
});

let defaultClient: IcSqlClient | null = null;

export const getIcSqlClient = (): IcSqlClient => {
  if (!defaultClient) {
    defaultClient = createAppSqlClient();
  }
  return defaultClient;
};

/** Test-only: replace SQL client (or pass null to reset). */
export const __setIcSqlClientForTests = (client: IcSqlClient | null): void => {
  defaultClient = client;
};

export const toBool = (value: unknown): boolean => {
  if (value === true || value === 1 || value === "1") {
    return true;
  }
  if (typeof value === "string" && value.toLowerCase() === "true") {
    return true;
  }
  return false;
};

export const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const toString = (value: unknown, fallback = ""): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
};
