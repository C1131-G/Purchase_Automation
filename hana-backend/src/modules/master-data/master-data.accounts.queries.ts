// Master Data Accounts Query: DSC1 (Chart of Accounts) lookup for account pickers.
// Relocated from the removed outgoing-payment module — PQ / PO / SQ / RFQ line items share it.
import { logger } from "@/core/logger/pino-logger";
import { GlAccountSchema } from "@/db/schemas/gl-account.schema";
import { getTenantRepository } from "@/db/tenant-query";

import type { AccountQuery } from "./master-data.schema";

// Fetches accounts from DSC1 for account selection in document line items.
export const getAccounts = async (dbName: string, query: AccountQuery) => {
  try {
    const repo = await getTenantRepository(dbName, GlAccountSchema);
    const queryBuilder = repo.createQueryBuilder("a");

    queryBuilder.select(["a.GLAccount", "a.Account"]);

    if (query.search) {
      queryBuilder.andWhere("LOWER(a.GLAccount) LIKE LOWER(:search)", {
        search: `%${query.search}%`,
      });
    }

    queryBuilder.orderBy("a.GLAccount", "ASC").take(query.limit ?? 20);

    const rows = await queryBuilder.getRawMany<Record<string, unknown>>();

    logger.info({
      msg: "Fetched DSC1 accounts",
      db: dbName,
      count: rows.length,
    });

    return {
      data: rows.map((row) => ({
        GLAccount: row["a_GLAccount"] as string,
        Account: row["a_Account"] as string,
      })),
      total: rows.length,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      err: caughtError,
      msg: "Failed to fetch DSC1 accounts",
    });
    const dbError = new Error(`Failed to retrieve accounts: ${caughtError.message}`) as Error & {
      statusCode?: number;
    };
    dbError.statusCode = 500;
    throw dbError;
  }
};
