// Bank Details Service: Read-only lookup for SAP B1 bank master data (ODSC).

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { BankDetailsSchema } from "@/db/schemas/bank-details.schema";
import type { MasterDataQuery } from "@/validation/schemas/inputs/master-data.input";

export const getBankDetails = async (dbName: string, query: MasterDataQuery) => {
  try {
    const repo = await getTenantRepository(dbName, BankDetailsSchema);
    const qb = repo.createQueryBuilder("b");

    qb.select(["b.Country", "b.BankCode", "b.BankName"]);

    if (query.search) {
      qb.andWhere(
        "(LOWER(b.Country) LIKE LOWER(:search) OR LOWER(b.BankName) LIKE LOWER(:search))",
        { search: `%${query.search}%` },
      );
    }
    qb.orderBy("b.BankName", "ASC").take(query.limit ?? 20);

    const rows = await qb.getRawMany<Record<string, unknown>>();

    logger.info({
      msg: "Fetched ODSC bank details",
      db: dbName,
      count: rows.length,
    });

    return {
      data: rows.map((r) => ({
        CountryCod: r["b_CountryCod"] as string,
        BankCode: r["b_BankCode"] as string,
        BankName: r["b_BankName"] as string,
      })),
      total: rows.length,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      error: caughtError.message,
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
