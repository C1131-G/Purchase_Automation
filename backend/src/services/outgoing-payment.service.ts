// Outgoing Payment Service: Manages payment transactions to vendors. Handles list retrieval from HANA and transaction processing via the SAP VendorPayments service.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PaymentFilters } from "@/dal/types/outgoing-payment.types";
import { type OutgoingPayment, OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of Outgoing Payments from the tenant's HANA database.
export const getPayments = async (dbName: string, filters: PaymentFilters) => {
  try {
    const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
    const queryBuilder = repo.createQueryBuilder("payment");
    queryBuilder.where("1=1");

    // Dynamic Filter: Search by payment document number (Standard: DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(payment.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Filter by vendor code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("payment.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Filter by vendor name (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(payment.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Start date of the payment window (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("payment.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: End date of the payment window (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("payment.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: Filter by document total.
    if (filters.DocTotal !== undefined && filters.DocTotalOperator) {
      const operatorMap = { eq: "=", lt: "<", gt: ">" };
      const sqlOp = operatorMap[filters.DocTotalOperator];
      queryBuilder.andWhere(`payment.docTotal ${sqlOp} :docTotal`, {
        docTotal: filters.DocTotal,
      });
    }

    // Dynamic Filter: Payment Mode (U_Mode_Pay UDF).
    if (filters.PaymentMode) {
      queryBuilder.andWhere("payment.paymentMode = :paymentMode", {
        paymentMode: filters.PaymentMode,
      });
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "payment.docNum",
      DocDate: "payment.docDate",
      CardCode: "payment.cardCode",
      CardName: "payment.cardName",
      DocTotal: "payment.docTotal",
      PaymentMode: "payment.paymentMode",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "payment.docDate": "DESC", "payment.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination logic.
    const result = await PageService.getPagedData<OutgoingPayment>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "OutgoingPayments",
      dbName,
    });

    return {
      ...result,
      data: result.data.map((data) => ({
        id: data.docEntry,
        DocNum: data.docNum,
        DocDate: data.docDate,
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocTotal: data.docTotal,
        DocCurr: data.docCurr,
        PaymentMode: data.paymentMode,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
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
    return {
      id: result.DocEntry,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocDate: result.DocDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      Comments: result.Remarks,
      PaymentInvoices:
        (
          (result as unknown as Record<string, unknown>).PaymentInvoices as Record<
            string,
            unknown
          >[]
        )?.map((inv) => ({
          DocEntry: inv.DocEntry as number,
          SumApplied: inv.SumApplied as number,
          InvoiceType: inv.InvoiceType as string,
        })) || [],
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

// Submits a new vendor payment to SAP. Handles allocation across multiple A/P invoices.
export const createPayment = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      Remarks: payload.Remarks,
      CashSum: payload.CashSum || 0,
      TrsfrSum: payload.TrsfrSum || 0,
      PaymentInvoices:
        (payload.PaymentInvoices as Record<string, unknown>[])?.map((inv) => ({
          DocEntry: inv.DocEntry as number,
          SumApplied: inv.SumApplied as number,
          // SAP requires it_PurchaseInvoice to distinguish from generic AR payments.
          InvoiceType: (inv.InvoiceType as string) || "it_PurchaseInvoice",
        })) || [],
    };

    // Standardize DocDate for SAP (YYYY-MM-DD).
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }

    // Determine Payment Mode for UDF (U_Mode_Pay) - Aligning with SAP Valid Values
    // If explicitly provided, use it; otherwise derive from payment method fields.
    const allowedModes = ["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"];
    let paymentMode: string | undefined;

    if (payload.PaymentMode && allowedModes.includes(payload.PaymentMode as string)) {
      paymentMode = payload.PaymentMode as string;
    } else {
      // Derive from payment method components
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

      if (payload.TrsfrSum && (payload.TrsfrSum as number) > 0) modes.push("Direct Pay");

      if (modes.length === 1) {
        paymentMode = modes[0];
      } else if (modes.length > 1) {
        // Prefer non-CASH mode if multiple; default to CASH if only CASH appears
        paymentMode = modes.find((m) => m !== "CASH") || "CASH";
      }
    }

    if (paymentMode) {
      sapPayload.U_Mode_Pay = paymentMode;
    }

    // Execute payment post to VendorPayments endpoint.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/VendorPayments",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge purchase dashboard cache as liabilities have been settled.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Outgoing Payment created successfully",
      DocEntry: result.DocEntry,
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

export const outgoingPaymentService = {
  getPayments,
  getPaymentDocNums,
  getPayment,
  createPayment,
  updatePayment,
  cancelPayment,
};
