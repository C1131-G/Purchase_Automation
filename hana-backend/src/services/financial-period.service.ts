// Financial Period Service: Read-only lookup for active financial period data (OACP).

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { FinancialPeriodSchema } from "@/db/schemas/financial-period.schema";

export const getActivePeriod = async (dbName: string) => {
  try {
    const repo = await getTenantRepository(dbName, FinancialPeriodSchema);

    const activePeriod = await repo
      .createQueryBuilder("p")
      .select([
        "p.absEntry",
        "p.fRefDate",
        "p.tRefDate",
        "p.linkAct1",
        "p.linkAct2",
        "p.linkAct3",
        "p.linkAct12",
      ])
      .where("CURRENT_DATE BETWEEN p.fRefDate AND p.tRefDate")
      .getOne();

    if (!activePeriod) {
      return null;
    }

    logger.info({
      msg: "Fetched active financial period",
      db: dbName,
      period: activePeriod.absEntry,
    });

    return {
      AbsEntry: activePeriod.absEntry,
      F_RefDate: activePeriod.fRefDate,
      T_RefDate: activePeriod.tRefDate,
      LinkAct_1: activePeriod.linkAct1,
      LinkAct_2: activePeriod.linkAct2,
      LinkAct_3: activePeriod.linkAct3,
      LinkAct_12: activePeriod.linkAct12,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      error: caughtError.message,
      msg: "Failed to fetch active financial period",
    });
    const dbError = new Error(
      `Failed to retrieve financial period: ${caughtError.message}`,
    ) as Error & {
      statusCode?: number;
    };
    dbError.statusCode = 500;
    throw dbError;
  }
};

export const getLinkAct12ByDate = async (dbName: string, date: string) => {
  try {
    const repo = await getTenantRepository(dbName, FinancialPeriodSchema);

    const period = await repo
      .createQueryBuilder("p")
      .select(["p.absEntry", "p.fRefDate", "p.tRefDate", "p.linkAct12"])
      .where(":date BETWEEN p.fRefDate AND p.tRefDate", { date })
      .getOne();

    if (!period) {
      return null;
    }

    logger.info({
      msg: "Resolved LinkAct_12 for date",
      db: dbName,
      date,
      linkAct12: period.linkAct12,
    });

    return period.linkAct12;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      date,
      error: caughtError.message,
      msg: "Failed to resolve LinkAct_12 by date",
    });
    const dbError = new Error(
      `Failed to resolve transfer account: ${caughtError.message}`,
    ) as Error & {
      statusCode?: number;
    };
    dbError.statusCode = 500;
    throw dbError;
  }
};

export const financialPeriodService = {
  getActivePeriod,
  getLinkAct12ByDate,
};
