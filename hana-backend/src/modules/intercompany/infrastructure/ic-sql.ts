// Thin SQL port for IC tables (SBOCOMMON). Injectable for unit tests.

import { AppDataSource } from "@/db/config/data-source";

export type IcSqlClient = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ) => Promise<T[]>;
  /**
   * Run work on one pooled connection. Required for HANA session functions
   * like CURRENT_IDENTITY_VALUE() after INSERT (identity is connection-scoped;
   * a plain second query may use another pool connection and return 0).
   */
  withConnection?: <T>(callback: (sql: IcSqlClient) => Promise<T>) => Promise<T>;
};

/** Prefer withConnection when present; otherwise run on the given client. */
export const runOnSameConnection = async <T>(
  sql: IcSqlClient,
  callback: (conn: IcSqlClient) => Promise<T>,
): Promise<T> => {
  if (sql.withConnection) {
    return sql.withConnection(callback);
  }
  return callback(sql);
};

/**
 * INSERT then read CURRENT_IDENTITY_VALUE on the same connection.
 * Use for every identity-column insert against HANA via the TypeORM pool.
 */
export const insertAndReadIdentity = async (
  sql: IcSqlClient,
  insertSql: string,
  params: unknown[] = [],
): Promise<number> =>
  runOnSameConnection(sql, async (conn) => {
    await conn.query(insertSql, params);
    const idRows = await conn.query(`SELECT CURRENT_IDENTITY_VALUE() AS "ID" FROM DUMMY`);
    return toNumber(idRows[0]?.ID ?? idRows[0]?.id);
  });

/** Production client — TypeORM SAP driver against common schema. */
export const createAppSqlClient = (): IcSqlClient => {
  const query = async <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> => {
    const rows = await AppDataSource.query(sql, params);
    return (rows ?? []) as T[];
  };

  const client: IcSqlClient = {
    query,
    withConnection: async <T>(callback: (sql: IcSqlClient) => Promise<T>): Promise<T> => {
      const runner = AppDataSource.createQueryRunner();
      await runner.connect();
      try {
        const pinned: IcSqlClient = {
          query: async <R extends Record<string, unknown> = Record<string, unknown>>(
            statement: string,
            params: unknown[] = [],
          ): Promise<R[]> => {
            const rows = await runner.query(statement, params);
            return (rows ?? []) as R[];
          },
        };
        return await callback(pinned);
      } finally {
        await runner.release();
      }
    },
  };
  return client;
};

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
