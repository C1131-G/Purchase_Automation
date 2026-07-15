import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/db/tenant-query";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import { getDisplayCurrency } from "@/services/currency-format";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

import { buildIncomingPaymentSapPayload } from "./incoming-payment.payload";

export const createPayment = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    logger.info(
      {
        cardCode: payload.CardCode,
        invoiceCount: (payload.PaymentInvoices as Record<string, unknown>[])?.length,
      },
      "Incoming payment create started",
    );

    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || (process.env.COMMON_DB as string);

    const { sapPayload, surchargePostedAccount } = await buildIncomingPaymentSapPayload(
      sessionId,
      payload,
      dbName,
    );

    logger.info({
      msg: "Final Account Resolution Mappings",
      CashAccount: sapPayload.CashAccount,
      CheckAccounts: (sapPayload.PaymentChecks as any[])?.map((check) => check.CheckAccount),
      CardAccounts: (sapPayload.PaymentCreditCards as any[])?.map((card) => card.CreditAcct),
    });

    logger.info({ msg: "Sending Payload to SAP Service Layer", sapPayload });
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/IncomingPayments",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      msg: "Incoming Payment Created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      ...(surchargePostedAccount ? { SurchargePostedAccount: surchargePostedAccount } : {}),
    });

    // Real-time HANA insert so the new payment appears immediately in the table list.
    if (dbName && result.DocEntry && result.DocNum) {
      try {
        const ipRepo = await getTenantRepository(dbName, IncomingPaymentSchema);
        await ipRepo.save({
          docEntry: result.DocEntry,
          docNum: result.DocNum,
          docDate: new Date(sapPayload.DocDate as string),
          cardCode: sapPayload.CardCode as string,
          cardName: (payload.CardName as string) || (result.CardName as string) || "",
          docTotal:
            ((sapPayload.CashSum as number) || 0) +
            ((sapPayload.TransferSum as number) || 0) +
            ((sapPayload.PaymentCreditCards as any[])?.reduce(
              (sum, check) => sum + (check.CreditSum || 0),
              0,
            ) || 0) +
            ((sapPayload.PaymentChecks as any[])?.reduce((sum, check) => sum + (check.CheckSum || 0), 0) ||
              0) +
            ((sapPayload.BankChargeAmount as number) || 0),
          docCurr: result.DocCurrency || (await getDisplayCurrency(dbName)),
          paymentMode: (sapPayload.U_Mode_Pay as string) || "CASH",
        });
      } catch (error) {
        logger.warn({
          msg: "Failed to perform real-time insertion of Incoming Payment in HANA",
          err: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "Incoming Payment created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to create Incoming Payment in Service Layer",
    });
    throw caughtError;
  }
};
