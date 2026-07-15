// Bank Details Service: Read-only lookup for SAP B1 bank master data (ODSC).

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
import { BankDetailsSchema } from "@/db/schemas/bank-details.schema";
import type { MasterDataQuery } from "./bank-details.schema";

export const getBankDetails = async (dbName: string, query: MasterDataQuery) => {
  try {
    const repo = await getTenantRepository(dbName, BankDetailsSchema);
    const queryBuilder = repo.createQueryBuilder("b");

    queryBuilder.select(["b.Country", "b.BankCode", "b.BankName"]);

    if (query.search) {
      queryBuilder.andWhere(
        "(LOWER(b.Country) LIKE LOWER(:search) OR LOWER(b.BankName) LIKE LOWER(:search))",
        { search: `%${query.search}%` },
      );
    }
    if (query.country) {
      queryBuilder.andWhere("b.Country = :country", { country: query.country });
    }

    queryBuilder.orderBy("b.BankName", "ASC").take(query.limit ?? 50);

    const rows = await queryBuilder.getRawMany<Record<string, unknown>>();

    logger.info({
      msg: "Fetched ODSC bank details",
      db: dbName,
      count: rows.length,
    });

    return {
      data: rows.map((row) => ({
        CountryCod: row["b_CountryCod"] as string,
        BankCode: row["b_BankCode"] as string,
        BankName: row["b_BankName"] as string,
      })),
      total: rows.length,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      err: caughtError,
      msg: "Failed to fetch bank details",
    });
    const dbError = new Error(
      `Failed to retrieve bank details: ${caughtError.message}`,
    ) as Error & {
      statusCode?: number;
    };
    dbError.statusCode = 500;
    throw dbError;
  }
};

export const bankDetailsService = {
  getBankDetails,
};
