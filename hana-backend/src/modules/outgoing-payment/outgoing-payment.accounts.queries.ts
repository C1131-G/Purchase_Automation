// Outgoing Payment Service: Manages payment transactions to vendors. Uses HANA database for listings and SAP Service Layer for payment creation.
import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
import type { AccountQuery } from "./outgoing-payment-account.types";
import { GlAccountSchema } from "@/db/schemas/gl-account.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
// Fetches a paginated list of Outgoing Payments from HANA.

export const backfillPaymentModes = async (sessionId: string, batchSize = 50) => {
  const session = serviceLayerClient.getSession(sessionId);
  if (!session?.companyDB) {
    throw new Error("No active session");
  }

  try {
    // Get all VendorPayments from Service Layer
    const response = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/VendorPayments?$top=${batchSize}&$select=DocEntry,CashSum,TrsfrSum,CreditCard,CheckNum,U_Mode_Pay&$orderby=DocEntry DESC`,
    )) as {
      value: {
        DocEntry: number;
        CashSum?: number;
        TrsfrSum?: number;
        CreditCard?: number;
        CheckNum?: number;
        U_Mode_Pay?: string;
      }[];
    };

    const payments = response.value || [];
    logger.info({
      msg: "Backfill: Raw SL response",
      recordCount: payments.length,
      samplePayment: payments[0],
    });

    if (payments.length === 0) {
      logger.info({ msg: "Backfill: No records found" });
      return { message: "No records found", success: true, updated: 0 };
    }

    const recordsToUpdate = payments.filter(
      (p) =>
        !p.U_Mode_Pay &&
        ((p.CashSum && Number(p.CashSum) > 0) ||
          (p.TrsfrSum && Number(p.TrsfrSum) > 0) ||
          (p.CreditCard && Number(p.CreditCard) > 0) ||
          (p.CheckNum && Number(p.CheckNum) > 0)),
    );

    logger.info({
      count: recordsToUpdate.length,
      msg: "Backfill: Records needing update",
      sample: recordsToUpdate[0],
    });

    let updatedCount = 0;
    const allowedModes = new Set(["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"]);

    for (const row of recordsToUpdate) {
      try {
        const modes: string[] = [];

        if (row.CashSum && Number(row.CashSum) > 0) {
          modes.push("CASH");
        }

        if (row.CreditCard && Number(row.CreditCard) > 0) {
          const cardId = Number(row.CreditCard);
          if (cardId === 5) modes.push("M-Pesa");
          else if (cardId === 6) modes.push("My Cash");
          else if (cardId === 7) modes.push("Direct Pay");
          else modes.push("EFTPOS");
        }

        if (row.CheckNum && Number(row.CheckNum) > 0) {
          modes.push("Direct Pay");
        }

        if (row.TrsfrSum && Number(row.TrsfrSum) > 0) {
          modes.push("Direct Pay");
        }

        let paymentMode: string | undefined;
        if (modes.length === 1) {
          paymentMode = modes[0];
        } else if (modes.length > 1) {
          paymentMode = modes.find((m) => m !== "CASH") || "CASH";
        }

        if (paymentMode && allowedModes.has(paymentMode)) {
          await serviceLayerClient.request(sessionId, "PATCH", `/VendorPayments(${row.DocEntry})`, {
            U_Mode_Pay: paymentMode,
          });
          updatedCount++;
          logger.info({
            docEntry: row.DocEntry,
            msg: "Backfill: Updated payment",
            paymentMode,
          });
        }
      } catch (error) {
        logger.warn({
          msg: "Failed to backfill individual payment",
          docEntry: row.DocEntry,
          err: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    logger.info({ batchSize, msg: "Backfill complete", updated: updatedCount });
    return {
      message: `Updated ${updatedCount} records`,
      success: true,
      updated: updatedCount,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to backfill payment modes",
    });
    throw caughtError;
  }
};

// Fetches accounts from DSC1 for account selection in outgoing payment forms.

export const getAccounts = async (dbName: string, query: AccountQuery) => {
  try {
    const repo = await getTenantRepository(dbName, GlAccountSchema);
    const qb = repo.createQueryBuilder("a");

    qb.select(["a.GLAccount", "a.Account"]);

    if (query.search) {
      qb.andWhere("LOWER(a.GLAccount) LIKE LOWER(:search)", { search: `%${query.search}%` });
    }

    qb.orderBy("a.GLAccount", "ASC").take(query.limit ?? 20);

    const rows = await qb.getRawMany<Record<string, unknown>>();

    logger.info({
      msg: "Fetched DSC1 accounts",
      db: dbName,
      count: rows.length,
      accounts: rows.map((r) => r["a_GLAccount"]),
    });

    return {
      data: rows.map((r) => ({
        GLAccount: r["a_GLAccount"] as string,
        Account: r["a_Account"] as string,
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
