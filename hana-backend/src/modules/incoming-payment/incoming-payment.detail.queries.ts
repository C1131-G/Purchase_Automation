// Incoming Payment Service: Logic for processing payments from customers. Manages HANA database lookups for listings and SAP Service Layer for payment transactions.

import { In } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of Incoming Payments from HANA.

export const getPayment = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/IncomingPayments(${id})`,
    )) as SAPDocumentResponse;

    let creditCardsInfo: { CreditCardCode: number; CreditCardName: string }[] = [];
    try {
      const ccResponse = (await serviceLayerClient.request(sessionId, "GET", "/CreditCards")) as {
        value: { CreditCardCode: number; CreditCardName: string }[];
      };
      creditCardsInfo = ccResponse.value || [];
    } catch (error) {
      logger.warn({
        msg: "Failed to fetch CreditCards mapping",
        err: error instanceof Error ? error : new Error(String(error)),
      });
    }

    const rawCreditCards =
      ((result as unknown as Record<string, unknown>).PaymentCreditCards as Record<
        string,
        unknown
      >[]) || [];
    const mappedCreditCards = rawCreditCards.map((card: Record<string, unknown>) => {
      const ccInfo = creditCardsInfo.find((c) => c.CreditCardCode === card.CreditCard);
      return {
        ...card,
        CardName: ccInfo ? ccInfo.CreditCardName : `Card ${card.CreditCard}`,
      };
    });

    // SAP specific fields like CashSum and TransferSum are explicitly mapped.
    return {
      id: result.DocEntry,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocDate: result.DocDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      Remarks: result.Remarks,
      PaymentMode: (result as unknown as Record<string, unknown>).U_Mode_Pay,
      CashSum: (result as unknown as Record<string, unknown>).CashSum || 0,
      CashAccount: (result as unknown as Record<string, unknown>).CashAccount,
      CheckSum: (result as unknown as Record<string, unknown>).CheckSum || 0,
      TrsfrSum:
        (result as unknown as Record<string, unknown>).TransferSum ||
        (result as unknown as Record<string, unknown>).TrsfrSum ||
        0,
      PaymentChecks: (result as unknown as Record<string, unknown>).PaymentChecks || [],
      PaymentCreditCards: mappedCreditCards,
      PaymentAccounts: (result as unknown as Record<string, unknown>).PaymentAccounts || [],
      BankChargeAmount: (result as unknown as Record<string, unknown>).BankChargeAmount || 0,

      // maps the list of invoices settled by this payment.
      PaymentInvoices: await (async () => {
        const rawInvoices =
          ((result as unknown as Record<string, unknown>).PaymentInvoices as Record<
            string,
            unknown
          >[]) || [];

        const invoiceEntries = rawInvoices
          .filter((i) => i.InvoiceType === "it_Invoice")
          .map((i) => i.DocEntry as number);
        const creditMemoEntries = rawInvoices
          .filter((i) => i.InvoiceType === "it_CredItnote")
          .map((i) => i.DocEntry as number);

        const session = serviceLayerClient.getSession(sessionId);
        const dbName = session?.companyDB;

        const invoiceMap: Record<number, number> = {};
        const creditMemoMap: Record<number, number> = {};

        if (dbName) {
          if (invoiceEntries.length > 0) {
            try {
              const invRepo = await getTenantRepository(dbName, ARInvoiceSchema);
              const invoices = await invRepo.find({
                select: ["docEntry", "docNum"],
                where: { docEntry: In(invoiceEntries) },
              });
              invoices.forEach((inv) => (invoiceMap[inv.docEntry] = inv.docNum));
            } catch (error) {
              logger.error({
                msg: "Failed to fetch DocNums for invoices",
                err: error instanceof Error ? error : new Error(String(error)),
              });
            }
          }
          if (creditMemoEntries.length > 0) {
            try {
              const cmRepo = await getTenantRepository(dbName, ARCreditMemoSchema);
              const cms = await cmRepo.find({
                select: ["docEntry", "docNum"],
                where: { docEntry: In(creditMemoEntries) },
              });
              cms.forEach((cm) => (creditMemoMap[cm.docEntry] = cm.docNum));
            } catch (error) {
              logger.error({
                msg: "Failed to fetch DocNums for credit memos",
                err: error instanceof Error ? error : new Error(String(error)),
              });
            }
          }
        }

        return rawInvoices.map((inv) => ({
          DocEntry: inv.DocEntry as number,
          DocNum:
            inv.InvoiceType === "it_Invoice"
              ? invoiceMap[inv.DocEntry as number]
              : creditMemoMap[inv.DocEntry as number],
          InvoiceType: inv.InvoiceType as string,
          SumApplied: inv.SumApplied as number,
        }));
      })(),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch Incoming Payment from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an Incoming Payment by DocNum from tenant DB and fetches full details from Service Layer.

export const getPaymentByDocNum = async (sessionId: string, dbName: string, docNum: string) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    const error = new Error("DocNum is required") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const repo = await getTenantRepository(dbName, IncomingPaymentSchema);
  const match = await repo
    .createQueryBuilder("p")
    .select(["p.docEntry"])
    .where("CAST(p.docNum AS NVARCHAR) = :docNum", { docNum: normalizedDocNum })
    .getOne();

  if (!match?.docEntry) {
    const error = new Error("Incoming Payment not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  return getPayment(sessionId, String(match.docEntry));
};

// Posts a new payment to SAP. Handles multi-invoice reconciliation if details are provided.
