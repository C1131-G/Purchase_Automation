// Incoming Payment Service: Logic for processing payments from customers. Manages HANA database lookups for listings and SAP Service Layer for payment transactions.

import { In } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PaymentFilters } from "@/dal/types/incoming-payment.types";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import type { IncomingPayment } from "@/db/schemas/incoming-payment.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

import { resolveGLAccount } from "./account-resolution.service";

// Fetches a paginated list of Incoming Payments from HANA.
export const getPayments = async (dbName: string, filters: PaymentFilters) => {
  try {
    const repo = await getTenantRepository(dbName, IncomingPaymentSchema);
    const queryBuilder = repo.createQueryBuilder("p");

    queryBuilder.where("1=1");

    // Dynamic Filter: Payment Document Number (Standard: DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(p.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Customer Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("p.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Customer Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(p.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Date Range Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("p.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Date Range End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("p.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }
    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("p.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("p.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("p.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }
    // Dynamic Filter: Counter reference.
    if (filters.CounterRef) {
      queryBuilder.andWhere("LOWER(p.counterRef) LIKE LOWER(:counterRef)", {
        counterRef: `%${filters.CounterRef}%`,
      });
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "p.cardCode",
      CardName: "p.cardName",
      DocDate: "p.docDate",
      DocNum: "p.docNum",
      DocTotal: "p.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "p.docDate": "DESC", "p.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes paginated query and sorts by descending date/number by default.
    const result = await PageService.getPagedData<IncomingPayment>({
      dbName,
      entityName: "IncomingPayments",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    // Transform database results to standardized API output.
    return {
      ...result,
      data: result.data.map((data) => ({
        CardCode: data.cardCode,
        CardName: data.cardName,
        CounterRef: data.counterRef,
        DocCurr: data.docCurr,
        DocDate: data.docDate,
        DocNum: data.docNum,
        DocTotal: data.docTotal,
        PaymentMode: data.paymentMode,
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

export const getPaymentDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, IncomingPaymentSchema);
  const queryBuilder = repo.createQueryBuilder("p");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("p.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(p.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("p.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Obtains detailed payment data, including which invoices were paid by this document.
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
        error: String(error),
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
      CheckSum: (result as unknown as Record<string, unknown>).CheckSum || 0,
      TrsfrSum:
        (result as unknown as Record<string, unknown>).TransferSum ||
        (result as unknown as Record<string, unknown>).TrsfrSum ||
        0,
      PaymentChecks: (result as unknown as Record<string, unknown>).PaymentChecks || [],
      PaymentCreditCards: mappedCreditCards,
      PaymentAccounts: (result as unknown as Record<string, unknown>).PaymentAccounts || [],

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
                error: String(error),
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
                error: String(error),
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
      error: caughtError.message,
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
export const createPayment = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    logger.info({
      cardCode: payload.CardCode,
      invoiceCount: (payload.PaymentInvoices as Record<string, unknown>[])?.length,
      msg: "Incoming Payment Initiation [v2-GL-Resolution]",
      rawPayload: payload,
    });

    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || (process.env.COMMON_DB as string);

    // Identify the branch/location for dynamic account resolution.
    const branch = (payload.PaymentChecks as any[])?.[0]?.Branch || (payload.Branch as string);

    // Construct SAP payload. CashSum and TrsfrSum define the payment split.
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      DocObjectCode: "bopot_IncomingPayments",
      PaymentInvoices:
        (payload.PaymentInvoices as Record<string, unknown>[])
          ?.sort((a, b) => {
            // Put Invoices (it_Invoice) before Credit Notes (it_CredItnote)
            const typeA = a.InvoiceType === "it_Invoice" ? 0 : 1;
            const typeB = b.InvoiceType === "it_Invoice" ? 0 : 1;
            return typeA - typeB;
          })
          .map((inv) => {
            let sapType = "13"; // Default to it_Invoice
            let sumApplied = inv.SumApplied as number;

            if (inv.InvoiceType === "it_CredItnote") {
              sapType = "14";
              // Negative sign experiment for credit notes
              sumApplied = -Math.abs(sumApplied);
            }
            if (inv.InvoiceType === "it_Return") sapType = "16";

            return {
              DocEntry: inv.DocEntry as number,
              SumApplied: sumApplied,
              InvoiceType: sapType,
            };
          }) || [],
      Reference: payload.Reference,
      Remarks: payload.Remarks,
    };

    // Determine Payment Mode for UDF (U_Mode_Pay) - Aligning with SAP Valid Values
    const modes: string[] = [];
    if (payload.CashSum && (payload.CashSum as number) > 0) {
      modes.push("CASH");
    }

    if (Array.isArray(payload.PaymentCreditCards) && payload.PaymentCreditCards.length > 0) {
      const firstCard = payload.PaymentCreditCards[0] as Record<string, unknown>;
      const cardId = Number(firstCard.CreditCard);

      if (cardId === 5) {
        modes.push("M-Pesa");
      } else if (cardId === 6) {
        modes.push("My Cash");
      } else if (cardId === 7) {
        modes.push("Direct Pay");
      } else {
        modes.push("EFTPOS");
      }
    }

    if (Array.isArray(payload.PaymentChecks) && payload.PaymentChecks.length > 0) {
      const checks = payload.PaymentChecks as Record<string, unknown>[];
      const hasCash = checks.some((c) => c.BankCode === "CASH");
      const hasRealCheck = checks.some((c) => c.BankCode !== "CASH");
      if (hasCash) {
        modes.push("CASH");
      }
      if (hasRealCheck) {
        modes.push("Direct Pay");
      }
    }

    if (payload.TrsfrSum && (payload.TrsfrSum as number) > 0) {
      modes.push("Direct Pay");
    }

    if (modes.length === 1) {
      sapPayload.U_Mode_Pay = modes[0];
    } else if (modes.length > 1) {
      // If multiple, default to EFTPOS or the first non-CASH mode if available
      sapPayload.U_Mode_Pay = modes.find((m) => m !== "CASH") || "CASH";
    }

    if (payload.CashSum && (payload.CashSum as number) > 0) {
      sapPayload.CashSum = payload.CashSum;
      if (payload.CashAccount) {
        sapPayload.CashAccount = payload.CashAccount;
      } else {
        sapPayload.CashAccount = await resolveGLAccount(dbName, branch, "Cash");
      }
    }

    if (payload.TrsfrSum && (payload.TrsfrSum as number) > 0) {
      sapPayload.TrsfrSum = payload.TrsfrSum;
    }

    if (Array.isArray(payload.PaymentCreditCards) && payload.PaymentCreditCards.length > 0) {
      const surcharge = Number(payload.SurchargeTotal) || 0; // retained for potential future use
      sapPayload.PaymentCreditCards = await Promise.all(
        (payload.PaymentCreditCards as Record<string, unknown>[]).map(async (card, idx) => {
          let cardAmount = Number(card.CreditSum) || 0;
          // No automatic surcharge subtraction applied
          return {
            LineNum: idx,
            CreditCard: card.CreditCard,
            CreditSum: cardAmount,
            VoucherNum: card.VoucherNum,
            CreditAcct:
              card.CreditAcct ||
              (await resolveGLAccount(dbName, branch, "CreditCard", Number(card.CreditCard))),
            CreditCardNumber: "123", // Placeholder required by SAP
            CardValidUntil: "2026-12-31", // Placeholder required by SAP
          };
        })
      );
    }

    if (Array.isArray(payload.PaymentChecks) && payload.PaymentChecks.length > 0) {
      const realChecks = (payload.PaymentChecks as Record<string, unknown>[]).filter(
        (chk) => chk.BankCode !== "CASH",
      );

      if (realChecks.length > 0) {
        let totalCheckSum = 0;
        sapPayload.PaymentChecks = await Promise.all(
          realChecks.map(async (chk, idx) => {
            const checkAmount = Number(chk.CheckSum) || 0;
            totalCheckSum += checkAmount;
            return {
              LineNum: idx,
              DueDate: chk.DueDate || sapPayload.DocDate,
              CheckNumber: chk.CheckNumber,
              BankCode: chk.BankCode,
              Branch: chk.Branch,
              CheckSum: checkAmount,
              CheckAccount: await resolveGLAccount(dbName, branch, "Check"),
              Endorse: chk.Endorse || "tNO",
              OriginallyIssuedBy: chk.OriginallyIssuedBy,
            };
          }),
        );
      }
    }

    if (payload.SurchargeTotal && (payload.SurchargeTotal as number) > 0) {
      sapPayload.BankChargeAmount = payload.SurchargeTotal;
    }

    const paymentAccounts = (payload.PaymentAccounts as Record<string, unknown>[]) || [];

    if (paymentAccounts.length > 0) {
      sapPayload.PaymentAccounts = paymentAccounts.map((acc, idx) => ({
        AccountCode: acc.AccountCode,
        Decription: acc.Decription || "Surcharge",
        LineNum: idx,
        SumPaid: acc.SumPaid,
      }));
    }

    // Standardize DocDate for SAP Service Layer (YYYY-MM-DD).
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }

    // Execute POST request to create the payment record.
    logger.info({
      msg: "Final Account Resolution Mappings",
      CashAccount: sapPayload.CashAccount,
      CheckAccounts: (sapPayload.PaymentChecks as any[])?.map((c) => c.CheckAccount),
      CardAccounts: (sapPayload.PaymentCreditCards as any[])?.map((c) => c.CreditAcct),
    });

    logger.info({ msg: "Sending Payload to SAP Service Layer", sapPayload });
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/IncomingPayments",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge sales-related dashboard cache to reflect the updated receivables.
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
      error: caughtError.message,
      msg: "Failed to create Incoming Payment in Service Layer",
    });
    throw caughtError;
  }
};

// Updates non-financial metadata (Remarks, Reference) on an existing payment.
export const updatePayment = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Remarks) {
      sapPayload.Remarks = payload.Remarks;
    }
    if (payload.Reference) {
      sapPayload.Reference = payload.Reference;
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/IncomingPayments(${id})`, sapPayload);

    // Clear dashboard cache for the tenant to ensure consistency.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { message: "Incoming Payment updated successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update Incoming Payment",
    });
    throw caughtError;
  }
};

// Triggers the cancellation workflow for a payment document in SAP B1.
export const cancelPayment = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/IncomingPayments(${id})/Cancel`);

    // Must clear dashboard cache as receivables will increase upon payment cancellation.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "Incoming Payment cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel Incoming Payment in Service Layer",
    });
    throw caughtError;
  }
};

export const incomingPaymentService = {
  cancelPayment,
  createPayment,
  getPayment,
  getPaymentByDocNum,
  getPaymentDocNums,
  getPayments,
  updatePayment,
};
