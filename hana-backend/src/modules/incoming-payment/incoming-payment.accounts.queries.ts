// Incoming Payment Service: Logic for processing payments from customers. Manages HANA database lookups for listings and SAP Service Layer for payment transactions.

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
import { ChartOfAccountSchema } from "@/db/schemas/chart-of-accounts.schema";
// Fetches a paginated list of Incoming Payments from HANA.

export const getAccounts = async (dbName: string, query: { search?: string; limit?: number }) => {
  try {
    const repo = await getTenantRepository(dbName, ChartOfAccountSchema);

    let sql = `SELECT "AcctCode", "AcctName" FROM "OACT" WHERE "Postable" = 'Y'`;
    if (query.search) {
      const search = query.search.toLowerCase().replace(/'/g, "''");
      sql += ` AND (LOWER("AcctCode") LIKE '%${search}%' OR LOWER("AcctName") LIKE '%${search}%')`;
    }
    sql += ` ORDER BY "AcctCode" ASC LIMIT ${query.limit ?? 500}`;

    const rows = await repo.query(sql);

    logger.info({
      dbName,
      limit: query.limit,
      msg: "Fetched OACT accounts raw",
      rowsReturned: rows?.length,
      search: query.search,
    });

    return {
      data: (rows || []).map((row: any) => ({
        GLAccount: row.AcctCode || row.ACCTCODE || row.acctcode || row.a_AcctCode,
        Account: row.AcctName || row.ACCTNAME || row.acctname || row.a_AcctName,
      })),
      total: rows?.length || 0,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      err: caughtError,
      msg: "Failed to fetch OACT cash accounts",
    });
    const dbError = new Error(`Failed to retrieve accounts: ${caughtError.message}`) as Error & {
      statusCode?: number;
    };
    dbError.statusCode = 500;
    throw dbError;
  }
};
