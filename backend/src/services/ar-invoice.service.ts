// A/R Invoice Service: Logic for A/R Invoices (Sales), utilizing HANA for listings and SAP Service Layer for transaction management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { InvoiceFilters } from "@/dal/types/ar-invoice.types";
import { type ARInvoice, ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of A/R Invoices from HANA with dynamic filtering support.
export const getInvoices = async (dbName: string, filters: InvoiceFilters) => {
  try {
    const repo = await getTenantRepository(dbName, ARInvoiceSchema);
    const queryBuilder = repo.createQueryBuilder("inv");
    queryBuilder.where("1=1");

    // Dynamic Filter: Invoice Number (DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(inv.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Customer Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("inv.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Customer Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(inv.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Date Range Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("inv.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Date Range End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("inv.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: SAP Document Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("inv.docStatus = :status", {
        status: filters.DocStatus,
      });
    }
    // Dynamic Filter: Customer reference (NumAtCard).
    if (filters.NumAtCard) {
      queryBuilder.andWhere("LOWER(inv.numAtCard) LIKE LOWER(:numAtCard)", {
        numAtCard: `%${filters.NumAtCard}%`,
      });
    }
    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("inv.docTotal = :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("inv.docTotal < :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("inv.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "inv.docNum",
      DocDate: "inv.docDate",
      CardCode: "inv.cardCode",
      CardName: "inv.cardName",
      DocTotal: "inv.docTotal",
      NumAtCard: "inv.numAtCard",
      DocStatus: "inv.docStatus",
      paidSum: "inv.paidSum",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "inv.docDate": "DESC", "inv.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Handles pagination and sorting logic via unified PageService.
    const result = await PageService.getPagedData<ARInvoice>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "ARInvoices",
      dbName,
    });

    // Maps database entities to standardized API response objects.
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
        NumAtCard: data.numAtCard,
        DocStatus: data.docStatus,
        // Include paid amount for AR invoices to calculate outstanding balances on frontend.
        paidSum: ((data as Record<string, unknown>).paidSum as number) || 0,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to fetch A/R Invoices", error: error.message, db: dbName });
    throw error;
  }
};

export const getInvoiceDocNums = async (dbName: string, search?: string) => {
  const repo = await getTenantRepository(dbName, ARInvoiceSchema);
  const queryBuilder = repo.createQueryBuilder("inv");

  queryBuilder.select("inv.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(inv.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("inv.docNum", "DESC");

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Retrieves detailed data for a single A/R Invoice from the SAP Service Layer.
export const getInvoice = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/Invoices(${id})`,
    )) as SAPDocumentResponse;

    // Normalize SAP internal status (bost_Open) to a single character code.
    return {
      id: result.DocEntry,
      DocNum: result.DocNum,
      DocDate: result.DocDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Address: result.Address,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      Comments: result.Comments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => ({
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Quantity: line.Quantity,
        Price: line.Price,
        TaxCode: line.TaxCode,
        WarehouseCode: line.WarehouseCode,
        LineTotal: line.LineTotal,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch A/R Invoice from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Creates a new Sales Invoice (A/R Invoice) in SAP B1.
export const createInvoice = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Map input payload to the canonical SAP Service Layer JSON structure.
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      Comments: payload.Comments,
      DocumentLines: (payload.DocumentLines as Record<string, unknown>[])?.map((item) => ({
        ItemCode: item.ItemCode as string,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        TaxCode: item.TaxCode as string,
        WarehouseCode: item.WarehouseCode as string,
      })),
    };

    // Correct date formatting to YYYY-MM-DD.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }

    // Submit POST request to SAP for invoice creation.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/Invoices",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge sales-related dashboard cache to ensure totals are recalculated.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "A/R Invoice created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to create A/R Invoice in Service Layer", error: error.message });
    throw error;
  }
};

// Updates metadata (Comments) on an existing A/R Invoice.
export const updateInvoice = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Comments) sapPayload.Comments = payload.Comments;

    // Partial update via PATCH.
    await serviceLayerClient.request(sessionId, "PATCH", `/Invoices(${id})`, sapPayload);

    // Invalidate tenant-specific sales dashboard cache.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { success: true, message: "A/R Invoice updated successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to update A/R Invoice", error: error.message, id });
    throw error;
  }
};

// Executes the cancellation procedure for an A/R Invoice in SAP B1.
export const cancelInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Invoices(${id})/Cancel`);

    // Dashboard caches Must be purged to reflect the loss of revenue/receivables.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { success: true, message: "A/R Invoice cancelled successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to cancel A/R Invoice", error: error.message, id });
    throw error;
  }
};

export const arInvoiceService = {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
};
