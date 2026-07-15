import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";

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
    const activePeriods = (await executeTenantQuery(
      dbName,
      'SELECT "LinkAct_2", "LinkAct_12", "BnkChgAct", "AbsEntry" FROM "OACP" WHERE CURRENT_DATE BETWEEN "F_RefDate" AND "T_RefDate"',
    )) as any[];
    const activePeriod = activePeriods?.[0];

    if (activePeriod) {
      const bnkChgAct =
        activePeriod.BnkChgAct || activePeriod.bnkChgAct || (activePeriod as any).BNKCHGACT;
      const linkAct2 =
        activePeriod.LinkAct_2 || activePeriod.linkAct2 || (activePeriod as any).LINKACT_2;
      const absEntry =
        activePeriod.AbsEntry || activePeriod.absEntry || (activePeriod as any).ABSENTRY;

      if (paymentType === "Surcharge") {
        if (bnkChgAct) {
          logger.info({
            msg: `Resolved G/L account for ${paymentType} via raw query (OACP.BnkChgAct)`,
            account: bnkChgAct,
            period: absEntry,
          });
          return bnkChgAct;
        }
      }
      if (linkAct2) {
        const accountCode = linkAct2;

        logger.info({
          msg: `Resolved G/L account for ${paymentType} via raw query (OACP.LinkAct_2)`,
          account: accountCode,
          period: absEntry,
        });

        return accountCode;
      }
    }
  } catch (err: any) {
    logger.error({
      msg: `TypeORM Account Resolution Failed for ${paymentType}`,
      err: err,
    });
  }

  // Fallback error if no period is found
  throw new Error(
    `STRICT RESOLUTION FAILED: No active financial period found in SAP to resolve ${paymentType} account.`,
  );
};
