// A/P Invoice Service: Handles business logic for A/P Invoices, including HANA-based filtered lookups and SAP Service Layer document lifecycle management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { InvoiceFilters } from "@/dal/types/ap-invoice.types";
import { type APInvoice, APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Retrieves a paginated list of A/P Invoices from the tenant's HANA database.
// Uses TypeORM QueryBuilder for dynamic SQL generation based on provided filters.
export const getInvoices = async (dbName: string, filters: InvoiceFilters) => {
  try {
    const repo = await getTenantRepository(dbName, APInvoiceSchema);
    const queryBuilder = repo.createQueryBuilder("invoice");
    // Start with a neutral where clause to allow easy appending of dynamic filters.
    queryBuilder.where("1=1");

    // Dynamic Filter: Invoice Number (DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(invoice.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Vendor Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("invoice.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Vendor Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(invoice.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Date Range Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("invoice.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Date Range End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("invoice.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: SAP Document Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("invoice.docStatus = :status", {
        status: filters.DocStatus,
      });
    }
    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("invoice.docTotal = :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("invoice.docTotal < :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("invoice.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "invoice.docNum",
      DocDate: "invoice.docDate",
      CardCode: "invoice.cardCode",
      CardName: "invoice.cardName",
      DocTotal: "invoice.docTotal",
      DocStatus: "invoice.docStatus",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "invoice.docDate": "DESC", "invoice.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Delegate pagination and HANA-specific row-limiting logic to PageService.
    const result = await PageService.getPagedData<APInvoice>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "APInvoices",
      dbName,
    });

    // Map internal DB fields to a consistent API response structure.
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
        DocStatus: data.docStatus,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw error;
  }
};

export const getInvoiceDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, APInvoiceSchema);
  const queryBuilder = repo.createQueryBuilder("invoice");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("invoice.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(invoice.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("invoice.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Fetches full document details for a specific A/P Invoice directly from the SAP Service Layer.
// This includes line items which are typically not loaded in the list view.
export const getInvoice = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseInvoices(${id})`,
    )) as SAPDocumentResponse;

    // Normalizing SAP's internal status representation (bost_Open -> 'O') for the frontend.
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
      msg: "Failed to fetch A/P Invoice from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Creates a new A/P Invoice in SAP B1. Handles data mapping and date formatting.
export const createInvoice = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Map the internal payload to the strict SAP Service Layer document format.
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      Comments: payload.Comments,
      DocumentLines: (payload.DocumentLines as Record<string, unknown>[])?.map((item) => {
        const docLine: Record<string, unknown> = {
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          TaxCode: item.TaxCode as string,
          WarehouseCode: item.WarehouseCode as string,
        };

        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          docLine.BaseType = item.BaseType;
          docLine.BaseEntry = item.BaseEntry;
          docLine.BaseLine = item.BaseLine;
        }

        return docLine;
      }),
    };

    // Ensure DocDate is in ISO YYYY-MM-DD format as required by SAP Service Layer.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }

    // Create the purchase invoice document in SAP.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseInvoices",
      sapPayload,
    )) as SAPDocumentResponse;

    // Cache Invalidation: Clear dashboard stats for this tenant since a new invoice affects outstanding totals.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "A/P Invoice created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to create A/P Invoice in Service Layer", error: error.message });
    throw error;
  }
};

// Updates an existing A/P Invoice. Currently, only the 'Comments' field is allowed for modification.
export const updateInvoice = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Comments) sapPayload.Comments = payload.Comments;

    // PATCH request to SAP: Partial updates are standard for meta fields like comments.
    await serviceLayerClient.request(sessionId, "PATCH", `/PurchaseInvoices(${id})`, sapPayload);

    // Invalidate dashboard metrics to reflect any potential status changes (though comments usually don't).
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { success: true, message: "A/P Invoice updated successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to update A/P Invoice", error: error.message, id });
    throw error;
  }
};

// Cancels an A/P Invoice in SAP. This is a irreversible operational action in SAP B1.
export const cancelInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseInvoices(${id})/Cancel`);

    // Invalidate dashboard metrics to reflect the removal of this invoice from transactional totals.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { success: true, message: "A/P Invoice cancelled successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to cancel A/P Invoice", error: error.message, id });
    throw error;
  }
};

export const apInvoiceService = {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
};
