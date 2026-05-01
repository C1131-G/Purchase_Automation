// Outgoing Payment Service: Manages payment transactions to vendors. Uses SAP Service Layer for list retrieval.

import { In } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PaymentFilters } from "@/dal/types/outgoing-payment.types";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of Outgoing Payments from SAP Service Layer.
export const getPayments = async (sessionId: string, filters: PaymentFilters) => {
  try {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    // Build OData filter from URL params
    const filterParts: string[] = [];
    if (filters.DocNum) {
      filterParts.push(`contains(cast(DocNum,'string'),'${filters.DocNum}')`);
    }
    if (filters.CardCode) {
      filterParts.push(`contains(CardCode,'${filters.CardCode}')`);
    }
    if (filters.CardName) {
      filterParts.push(`contains(tolower(CardName),tolower('${filters.CardName}'))`);
    }
    if (filters.DocDateStart) {
      filterParts.push(`DocDate ge datetime'${filters.DocDateStart}T00:00:00'`);
    }
    if (filters.DocDateEnd) {
      filterParts.push(`DocDate le datetime'${filters.DocDateEnd}T23:59:59'`);
    }
    if (filters.PaymentMode) {
      filterParts.push(`U_Mode_Pay eq '${filters.PaymentMode}'`);
    }

    const filterQuery = filterParts.length > 0 ? `&$filter=${filterParts.join(" and ")}` : "";

    // Build OData orderby
    const sortFieldMap: Record<string, string> = {
      DocNum: "DocNum",
      DocDate: "DocDate",
      CardCode: "CardCode",
      CardName: "CardName",
      DocTotal: "TransferSum",
      PaymentMode: "U_Mode_Pay",
    };
    const sortBy = filters.sortBy ? sortFieldMap[filters.sortBy] : "DocDate";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    const orderbyQuery = `&$orderby=${sortBy} ${sortOrder}`;

    // Query SL with pagination - only select known-good fields
    // DocTotal may be called DocTotal or TransferSum in different SAP versions
    const selectFields =
      "DocEntry,DocNum,DocDate,CardCode,CardName,TransferSum,DocCurrency,U_Mode_Pay";
    const odataUrl = `/VendorPayments?$top=${limit}&$skip=${skip}&$select=${selectFields}${filterQuery}${orderbyQuery}`;

    const slResponse = (await serviceLayerClient.request(sessionId, "GET", odataUrl)) as {
      value: Array<{
        DocEntry: number;
        DocNum: number;
        DocDate: string;
        CardCode: string;
        CardName: string;
        TransferSum: number;
        DocCurrency: string;
        U_Mode_Pay?: string;
      }>;
      "@odata.count"?: string;
    };

    const payments = slResponse.value || [];
    const total = slResponse["@odata.count"]
      ? parseInt(slResponse["@odata.count"], 10)
      : payments.length;

    return {
      success: true,
      data: payments.map((payment) => ({
        id: payment.DocEntry,
        DocNum: payment.DocNum,
        DocDate: payment.DocDate,
        CardCode: payment.CardCode,
        CardName: payment.CardName,
        DocTotal: payment.TransferSum || 0,
        DocCurr: payment.DocCurrency,
        PaymentMode: payment.U_Mode_Pay || undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to fetch Outgoing Payments from SL", error: error.message });
    throw error;
  }
};

export const getPaymentDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
  const queryBuilder = repo.createQueryBuilder("payment");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("payment.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(payment.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("payment.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Retrieves a full Outgoing Payment document, including the breakdown of invoices it pays off.
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
    } catch (e) {
      logger.warn({ msg: "Failed to fetch CreditCards mapping", error: String(e) });
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

      PaymentInvoices: await (async () => {
        const rawInvoices =
          ((result as unknown as Record<string, unknown>).PaymentInvoices as Record<
            string,
            unknown
          >[]) || [];

        const invoiceEntries = rawInvoices
          .filter((i) => i.InvoiceType === "it_PurchaseInvoice")
          .map((i) => i.DocEntry as number);
        const creditMemoEntries = rawInvoices
          .filter((i) => i.InvoiceType === "it_PurchCredItnote")
          .map((i) => i.DocEntry as number);

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
            } catch (e) {
              logger.error({ msg: "Failed to fetch DocNums for AP invoices", error: String(e) });
            }
          }
          if (creditMemoEntries.length > 0) {
            try {
              const cmRepo = await getTenantRepository(dbName, APCreditMemoSchema);
              const cms = await cmRepo.find({
                where: { docEntry: In(creditMemoEntries) },
                select: ["docEntry", "docNum"],
              });
              cms.forEach((cm) => (creditMemoMap[cm.docEntry] = cm.docNum));
            } catch (e) {
              logger.error({
                msg: "Failed to fetch DocNums for AP credit memos",
                error: String(e),
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
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch Outgoing Payment from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Resolves an Outgoing Payment by DocNum from tenant DB and fetches full details from Service Layer.
export const getPaymentByDocNum = async (sessionId: string, dbName: string, docNum: string) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    const error = new Error("DocNum is required") as Error & { statusCode?: number; code?: string };
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
export const createPayment = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      Remarks: payload.Remarks,
      Reference: payload.Reference,
      CashSum: payload.CashSum || 0,
      TransferSum: payload.TransferSum || payload.TrsfrSum || 0,
      PaymentInvoices:
        (payload.PaymentInvoices as Record<string, unknown>[])
          ?.sort((a, b) => {
            const typeA = a.InvoiceType === "it_PurchaseInvoice" ? 0 : 1;
            const typeB = b.InvoiceType === "it_PurchaseInvoice" ? 0 : 1;
            return typeA - typeB;
          })
          .map((inv) => {
            let sapType = "18";
            let sumApplied = inv.SumApplied as number;

            if (inv.InvoiceType === "it_PurchCredItnote") {
              sapType = "19";
              sumApplied = -Math.abs(sumApplied);
            }

            return {
              DocEntry: inv.DocEntry as number,
              SumApplied: sumApplied,
              InvoiceType: sapType,
            };
          }) || [],
    };

    const modes: string[] = [];
    if (payload.CashSum && (payload.CashSum as number) > 0) modes.push("CASH");

    if (Array.isArray(payload.PaymentCreditCards) && payload.PaymentCreditCards.length > 0) {
      const firstCard = payload.PaymentCreditCards[0] as Record<string, unknown>;
      const cardId = Number(firstCard.CreditCard);

      if (cardId === 5) modes.push("M-Pesa");
      else if (cardId === 6) modes.push("My Cash");
      else if (cardId === 7) modes.push("Direct Pay");
      else modes.push("EFTPOS");
    }

    if (Array.isArray(payload.PaymentChecks) && payload.PaymentChecks.length > 0) {
      const checks = payload.PaymentChecks as Record<string, unknown>[];
      const hasCash = checks.some((c) => c.BankCode === "CASH");
      const hasRealCheck = checks.some((c) => c.BankCode !== "CASH");
      if (hasCash) modes.push("CASH");
      if (hasRealCheck) modes.push("Direct Pay");
    }

    const transferSum = (payload.TransferSum || payload.TrsfrSum || 0) as number;
    if (transferSum > 0) modes.push("Direct Pay");

    if (modes.length === 1) {
      sapPayload.U_Mode_Pay = modes[0];
    } else if (modes.length > 1) {
      sapPayload.U_Mode_Pay = modes.find((m) => m !== "CASH") || "CASH";
    }

    if (payload.SurchargeTotal && (payload.SurchargeTotal as number) > 0) {
      sapPayload.BankChargeAmount = payload.SurchargeTotal;
    }

    if (payload.CashSum && (payload.CashSum as number) > 0) {
      sapPayload.CashSum = payload.CashSum;
      if (payload.CashAccount) {
        sapPayload.CashAccount = payload.CashAccount;
      }
    }

    if (transferSum > 0) {
      sapPayload.TransferSum = transferSum;
    }

    if (Array.isArray(payload.PaymentCreditCards) && payload.PaymentCreditCards.length > 0) {
      sapPayload.PaymentCreditCards = (payload.PaymentCreditCards as Record<string, unknown>[]).map(
        (card, idx) => ({
          LineNum: idx,
          CreditCard: card.CreditCard,
          CreditSum: card.CreditSum,
          VoucherNum: card.VoucherNum,
          CreditAcct: card.CreditAcct,
          CreditCardNumber: "123",
          CardValidUntil: "2026-12-31",
        }),
      );
    }

    if (Array.isArray(payload.PaymentChecks) && payload.PaymentChecks.length > 0) {
      const realChecks = (payload.PaymentChecks as Record<string, unknown>[]).filter(
        (chk) => chk.BankCode !== "CASH",
      );

      if (realChecks.length > 0) {
        sapPayload.PaymentChecks = realChecks.map((chk, idx) => ({
          LineNum: idx,
          DueDate: chk.DueDate || sapPayload.DocDate,
          CheckNumber: chk.CheckNumber,
          BankCode: chk.BankCode,
          Branch: chk.Branch,
          CheckSum: chk.CheckSum,
          CheckAccount: chk.CheckAccount || "AJAXBS040",
          Endorse: chk.Endorse || "tNO",
        }));
      }
    }

    if (Array.isArray(payload.PaymentAccounts) && payload.PaymentAccounts.length > 0) {
      sapPayload.PaymentAccounts = (payload.PaymentAccounts as Record<string, unknown>[]).map(
        (acc, idx) => ({
          LineNum: idx,
          AccountCode: acc.AccountCode,
          SumPaid: acc.SumPaid,
          Decription: acc.Decription || "Surcharge",
        }),
      );
    }

    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }

    logger.info({
      msg: "Creating Outgoing Payment via Service Layer",
      docDate,
      cardCode: payload.CardCode,
    });

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/VendorPayments",
      sapPayload,
    )) as { DocEntry: number; DocNum: number };

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Payment created successfully",
      id: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to create Outgoing Payment in Service Layer",
      error: error.message,
    });
    throw error;
  }
};

// Updates non-financial attributes (Remarks, Ref, PaymentMode) on an Outgoing Payment.
export const updatePayment = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Remarks) sapPayload.Remarks = payload.Remarks;
    if (payload.Reference) sapPayload.Reference = payload.Reference;

    // Allow direct PaymentMode update if provided and valid
    const allowedModes = ["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"];
    if (payload.PaymentMode && allowedModes.includes(payload.PaymentMode as string)) {
      sapPayload.U_Mode_Pay = payload.PaymentMode;
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/VendorPayments(${id})`, sapPayload);

    // Invalidate purchase-related dashboard metrics for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { success: true, message: "Outgoing Payment updated successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to update Outgoing Payment", error: error.message, id });
    throw error;
  }
};

// Cancels the outgoing payment document in SAP B1.
export const cancelPayment = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/VendorPayments(${id})/Cancel`);

    // Dashboard must be cleared to reflect the reinstatement of the payable.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { success: true, message: "Outgoing Payment cancelled successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to cancel Outgoing Payment in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Backfills U_Mode_Pay for existing OVPM rows via SAP Service Layer.
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
      value: Array<{
        DocEntry: number;
        CashSum?: number;
        TrsfrSum?: number;
        CreditCard?: number;
        CheckNum?: number;
        U_Mode_Pay?: string;
      }>;
    };

    const payments = response.value || [];
    logger.info({
      msg: "Backfill: Raw SL response",
      recordCount: payments.length,
      samplePayment: payments[0],
    });

    if (payments.length === 0) {
      logger.info({ msg: "Backfill: No records found" });
      return { success: true, message: "No records found", updated: 0 };
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
      msg: "Backfill: Records needing update",
      count: recordsToUpdate.length,
      sample: recordsToUpdate[0],
    });

    let updatedCount = 0;
    const allowedModes = ["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"];

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

        if (paymentMode && allowedModes.includes(paymentMode)) {
          await serviceLayerClient.request(sessionId, "PATCH", `/VendorPayments(${row.DocEntry})`, {
            U_Mode_Pay: paymentMode,
          });
          updatedCount++;
          logger.info({ msg: "Backfill: Updated payment", docEntry: row.DocEntry, paymentMode });
        }
      } catch (err) {
        logger.warn({
          msg: "Failed to backfill individual payment",
          docEntry: row.DocEntry,
          error: String(err),
        });
      }
    }

    logger.info({ msg: "Backfill complete", batchSize, updated: updatedCount });
    return { success: true, message: `Updated ${updatedCount} records`, updated: updatedCount };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to backfill payment modes", error: error.message });
    throw error;
  }
};

export const outgoingPaymentService = {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  createPayment,
  updatePayment,
  cancelPayment,
  backfillPaymentModes,
};
