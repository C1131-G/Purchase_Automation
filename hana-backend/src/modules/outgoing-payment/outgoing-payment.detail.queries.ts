// Outgoing Payment Service: Manages payment transactions to vendors. Uses HANA database for listings and SAP Service Layer for payment creation.
import { In } from "typeorm";
import { getDisplayCurrency } from "@/services/currency-format";

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of Outgoing Payments from HANA.

export const getPayment = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/VendorPayments(${id})`,
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
      const ccInfo = creditCardsInfo.find(
        (creditCardInfo) => creditCardInfo.CreditCardCode === card.CreditCard,
      );
      return {
        ...card,
        CardName: ccInfo ? ccInfo.CreditCardName : `Card ${card.CreditCard}`,
      };
    });

    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || (process.env.COMMON_DB as string) || "";
    const displayCurrency = await getDisplayCurrency(dbName);

    return {
      CardCode: result.CardCode,
      CardName: result.CardName,
      CashSum: (result as unknown as Record<string, unknown>).CashSum || 0,
      CheckSum: (result as unknown as Record<string, unknown>).CheckSum || 0,
      DocCurr: result.DocCurrency || displayCurrency,
      DocDate: result.DocDate,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocTotal: result.DocTotal,
      PaymentAccounts: (result as unknown as Record<string, unknown>).PaymentAccounts || [],
      PaymentChecks: (result as unknown as Record<string, unknown>).PaymentChecks || [],
      PaymentCreditCards: mappedCreditCards,
      PaymentInvoices: await (async () => {
        const rawInvoices =
          ((result as unknown as Record<string, unknown>).PaymentInvoices as Record<
            string,
            unknown
          >[]) || [];

        const invoiceEntries = rawInvoices
          .filter((invoice) => invoice.InvoiceType === "it_PurchaseInvoice")
          .map((invoice) => invoice.DocEntry as number);
        const creditMemoEntries = rawInvoices
          .filter((invoice) => invoice.InvoiceType === "it_PurchCredItnote")
          .map((invoice) => invoice.DocEntry as number);

        const session = serviceLayerClient.getSession(sessionId);
        const dbName = session?.companyDB;

        const invoiceMap: Record<number, number> = {};
        const creditMemoMap: Record<number, number> = {};

        if (dbName) {
          if (invoiceEntries.length > 0) {
            try {
              const invRepo = await getTenantRepository(dbName, APInvoiceSchema);
              const invoices = await invRepo.find({
                where: { docEntry: In(invoiceEntries) },
                select: ["docEntry", "docNum"],
              });
              invoices.forEach((inv) => (invoiceMap[inv.docEntry] = inv.docNum));
            } catch (entry) {
              logger.error({
                msg: "Failed to fetch DocNums for AP invoices",
                err: entry instanceof Error ? entry : new Error(String(entry)),
              });
            }
          }
          if (creditMemoEntries.length > 0) {
            try {
              const cmRepo = await getTenantRepository(dbName, APCreditMemoSchema);
              const cms = await cmRepo.find({
                where: { docEntry: In(creditMemoEntries) },
                select: ["docEntry", "docNum"],
              });
              cms.forEach((creditMemo) => (creditMemoMap[creditMemo.docEntry] = creditMemo.docNum));
            } catch (entry2) {
              logger.error({
                msg: "Failed to fetch DocNums for AP credit memos",
                err: entry2 instanceof Error ? entry2 : new Error(String(entry2)),
              });
            }
          }
        }

        return rawInvoices.map((inv) => ({
          DocEntry: inv.DocEntry as number,
          DocNum:
            inv.InvoiceType === "it_PurchaseInvoice"
              ? invoiceMap[inv.DocEntry as number]
              : creditMemoMap[inv.DocEntry as number],
          SumApplied: inv.SumApplied as number,
          InvoiceType: inv.InvoiceType as string,
        }));
      })(),
      PaymentMode: (result as unknown as Record<string, unknown>).U_Mode_Pay,
      Remarks: result.Remarks,
      CashAccount: (result as unknown as Record<string, unknown>).CashAccount,
      TransferDate: (result as unknown as Record<string, unknown>).TransferDate,
      TransferAccount: (result as unknown as Record<string, unknown>).TransferAccount,
      TransferReference: (result as unknown as Record<string, unknown>).TransferReference,
      TrsfrSum:
        (result as unknown as Record<string, unknown>).TransferSum ||
        (result as unknown as Record<string, unknown>).TrsfrSum ||
        0,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch Outgoing Payment from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an Outgoing Payment by DocNum from tenant DB and fetches full details from Service Layer.

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

  const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
  const match = await repo
    .createQueryBuilder("p")
    .select(["p.docEntry"])
    .where("CAST(p.docNum AS NVARCHAR) = :docNum", { docNum: normalizedDocNum })
    .getOne();

  if (!match?.docEntry) {
    const error = new Error("Outgoing Payment not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  return getPayment(sessionId, String(match.docEntry));
};

// Submits a new vendor payment to SAP. Handles allocation across multiple A/P invoices.
