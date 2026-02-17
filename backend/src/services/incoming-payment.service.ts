// Incoming Payment Service: Logic for processing payments from customers. Manages HANA database lookups for listings and SAP Service Layer for payment transactions.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PaymentFilters } from "@/dal/types/incoming-payment.types";
import { type IncomingPayment, IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

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
        queryBuilder.andWhere("p.docTotal = :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("p.docTotal < :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("p.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }
    // Dynamic Filter: Counter reference.
    if (filters.CounterRef) {
      queryBuilder.andWhere("LOWER(p.counterRef) LIKE LOWER(:counterRef)", {
        counterRef: `%${filters.CounterRef}%`,
      });
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "p.docNum",
      DocDate: "p.docDate",
      CardCode: "p.cardCode",
      CardName: "p.cardName",
      DocTotal: "p.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "p.docDate": "DESC", "p.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes paginated query and sorts by descending date/number by default.
    const result = await PageService.getPagedData<IncomingPayment>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "IncomingPayments",
      dbName,
    });

    // Transform database results to standardized API output.
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
        CounterRef: data.counterRef,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw error;
  }
};

// Obtains detailed payment data, including which invoices were paid by this document.
export const getPayment = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/IncomingPayments(${id})`,
    )) as SAPDocumentResponse;

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
      Comments: result.Remarks,
      // maps the list of invoices settled by this payment.
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
      msg: "Failed to fetch Incoming Payment from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Posts a new payment to SAP. Handles multi-invoice reconciliation if details are provided.
export const createPayment = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Construct SAP payload. CashSum and TrsfrSum define the payment split.
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
          InvoiceType: (inv.InvoiceType as string) || "it_Invoice",
        })) || [],
    };

    // Standardize DocDate for SAP Service Layer (YYYY-MM-DD).
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }

    // Execute POST request to create the payment record.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/IncomingPayments",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge sales-related dashboard cache to reflect the updated receivables.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Incoming Payment created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to create Incoming Payment in Service Layer",
      error: error.message,
    });
    throw error;
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
    if (payload.Remarks) sapPayload.Remarks = payload.Remarks;
    if (payload.Reference) sapPayload.Reference = payload.Reference;

    await serviceLayerClient.request(sessionId, "PATCH", `/IncomingPayments(${id})`, sapPayload);

    // Clear dashboard cache for the tenant to ensure consistency.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { success: true, message: "Incoming Payment updated successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to update Incoming Payment", error: error.message, id });
    throw error;
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

    return { success: true, message: "Incoming Payment cancelled successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to cancel Incoming Payment in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

export const incomingPaymentService = {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  cancelPayment,
};
