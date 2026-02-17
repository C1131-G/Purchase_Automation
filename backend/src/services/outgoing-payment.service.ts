// Outgoing Payment Service: Manages payment transactions to vendors. Handles list retrieval from HANA and transaction processing via the SAP VendorPayments service.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PaymentFilters } from "@/dal/types/outgoing-payment.types";
import { type OutgoingPayment, OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
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

    const sortFieldMap: Record<string, string> = {
      DocNum: "payment.docNum",
      DocDate: "payment.docDate",
      CardCode: "payment.cardCode",
      CardName: "payment.cardName",
      DocTotal: "payment.docTotal",
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
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw error;
  }
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

// Updates non-financial attributes (Remarks, Ref) on an Outgoing Payment.
export const updatePayment = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Remarks) sapPayload.Remarks = payload.Remarks;
    if (payload.Reference) sapPayload.Reference = payload.Reference;

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
  getPayment,
  createPayment,
  updatePayment,
  cancelPayment,
};
