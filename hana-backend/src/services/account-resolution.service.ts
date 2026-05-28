import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { FinancialPeriodSchema } from "@/db/schemas/financial-period.schema";

export type PaymentType = "Cash" | "Check" | "CreditCard" | "Surcharge";

/**
 * Resolves a G/L account dynamically using TypeORM.
 * All Incoming payments (Cash, Check, CreditCard) are routed to 'Checks Received' (LinkAct_2) as per request.
 */
export const resolveGLAccount = async (
  dbName: string,
  location: string | undefined,
  paymentType: PaymentType,
  _creditCardId?: number,
): Promise<string> => {
  try {
    const periodRepo = await getTenantRepository(dbName, FinancialPeriodSchema);

    // Fetch the active financial period using TypeORM QueryBuilder with property names
    const activePeriod = await periodRepo
      .createQueryBuilder("p")
      .select(["p.linkAct2", "p.linkAct12", "p.bnkChgAct", "p.absEntry"])
      .where("CURRENT_DATE BETWEEN p.fRefDate AND p.tRefDate")
      .getOne();

    if (activePeriod) {
      if (paymentType === "Surcharge") {
        if (activePeriod.bnkChgAct) {
          logger.info({
            msg: `Resolved G/L account for ${paymentType} via TypeORM (OACP.BnkChgAct)`,
            account: activePeriod.bnkChgAct,
            period: activePeriod.absEntry,
          });
          return activePeriod.bnkChgAct;
        }
      }
      if (activePeriod.linkAct2) {
        const accountCode = activePeriod.linkAct2;

        logger.info({
          msg: `Resolved G/L account for ${paymentType} via TypeORM (OACP.LinkAct_2)`,
          account: accountCode,
          period: activePeriod.absEntry,
        });

        return accountCode;
      }
    }
  } catch (err: any) {
    logger.error({
      msg: `TypeORM Account Resolution Failed for ${paymentType}`,
      error: err.message,
    });
  }

  // Fallback error if no period is found
  throw new Error(
    `STRICT RESOLUTION FAILED: No active financial period found in SAP to resolve ${paymentType} account.`,
  );
};
