// A/R Invoice Service: Logic for A/R Invoices (Sales), utilizing HANA for listings and SAP Service Layer for transaction management.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { executeTenantQuery, getTenantRepository } from "@/dal/tenant-dal.helper";
import type { InvoiceFilters } from "@/dal/types/ar-invoice.types";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import type { ARInvoice } from "@/db/schemas/ar-invoice.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { adjustPayloadDates } from "./date-adjustment.util";

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
      const statusMap: Record<string, string> = {
        Closed: "C",
        Open: "O",
      };
      const statusValue = statusMap[filters.DocStatus] || filters.DocStatus;
      queryBuilder.andWhere("inv.docStatus = :status", {
        status: statusValue,
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
        queryBuilder.andWhere("inv.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("inv.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("inv.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "inv.cardCode",
      CardName: "inv.cardName",
      DocDate: "inv.docDate",
      DocNum: "inv.docNum",
      DocStatus: "inv.docStatus",
      DocTotal: "inv.docTotal",
      NumAtCard: "inv.numAtCard",
      paidToDate: "inv.paidToDate",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "inv.docDate": "DESC", "inv.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Handles pagination and sorting logic via unified PageService.
    const result = await PageService.getPagedData<ARInvoice>({
      dbName,
      entityName: "ARInvoices",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
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
        BalanceDue:
          Math.round(
            (Number(data.docTotal) -
              Number(((data as unknown as Record<string, unknown>).paidToDate as number) || 0)) *
              100,
          ) / 100,
        DocCurr: data.docCurr,
        NumAtCard: data.numAtCard,
        DocStatus: data.docStatus,
        Address: data.address,
        Address2: data.address2,
        // Include paid amount for AR invoices to calculate outstanding balances on frontend.
        paidToDate: ((data as unknown as Record<string, unknown>).paidToDate as number) || 0,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      error: caughtError.message,
      msg: "Failed to fetch A/R Invoices",
    });
    throw caughtError;
  }
};

export const getInvoiceDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ARInvoiceSchema);
  const queryBuilder = repo.createQueryBuilder("inv");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("inv.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(inv.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("inv.docNum", "DESC");
  queryBuilder.take(safeLimit);

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
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Address: result.Address,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: result.TotalDiscount ?? 0,
      // normalizes SAP's internal string status.
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      Comments: result.Comments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        return normalizeSAPLineData(lineData);
      }),
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard || "",
      Address2: (result as unknown as Record<string, unknown>).Address2 || "",
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch A/R Invoice from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a DocNum to DocEntry from HANA and fetches full details from Service Layer.
export const getInvoiceByDocNum = async (sessionId: string, dbName: string, id: string) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new AppError("ID is required", 400, "VALIDATION_ERROR");
  }

  const repo = await getTenantRepository(dbName, ARInvoiceSchema);
  const match = await repo
    .createQueryBuilder("inv")
    .select(["inv.docEntry"])
    .where("CAST(inv.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  const finalId = match?.docEntry ? String(match.docEntry) : normalizedId;
  return getInvoice(sessionId, finalId);
};

// Helper: Resolves and appends greedy bin allocations to document lines if a warehouse has bin locations enabled.
export const resolveBinAllocations = async (
  dbName: string,
  documentLines: Record<string, unknown>[],
) => {
  try {
    for (let i = 0; i < documentLines.length; i++) {
      const line = documentLines[i];
      const warehouseCode = line.WarehouseCode as string;
      const itemCode = line.ItemCode as string;
      const quantity = Number(line.Quantity ?? 0);

      if (!warehouseCode || !itemCode || quantity <= 0) continue;

      // Check if warehouse has Bin Locations enabled
      const whsRows = (await executeTenantQuery(
        dbName,
        `SELECT "BinActivat" FROM "OWHS" WHERE "WhsCode" = ?`,
        [warehouseCode],
      )) as { BinActivat: string }[];

      if (!whsRows || whsRows.length === 0 || whsRows[0].BinActivat !== "Y") {
        continue;
      }

      // Warehouse has bins enabled. Fetch bin stock for this item ordered by OnHandQty (descending)
      const binStock = (await executeTenantQuery(
        dbName,
        `SELECT q."BinAbs", q."OnHandQty"
         FROM "OIBQ" q
         INNER JOIN "OBIN" b ON b."AbsEntry" = q."BinAbs"
         WHERE q."ItemCode" = ? AND q."WhsCode" = ? AND q."OnHandQty" > 0
         ORDER BY q."OnHandQty" DESC`,
        [itemCode, warehouseCode],
      )) as { BinAbs: number; OnHandQty: string }[];

      if (!binStock || binStock.length === 0) {
        continue; // No stock in bins; skip and let SAP raise standard stock errors if applicable
      }

      // Allocate stock greedily
      let remainingQty = quantity;
      const allocations: Record<string, unknown>[] = [];

      for (const bin of binStock) {
        if (remainingQty <= 0) break;
        const binQty = Number(bin.OnHandQty);
        const allocated = Math.min(remainingQty, binQty);

        allocations.push({
          BaseLineNumber: i,
          BinAbsEntry: bin.BinAbs,
          Quantity: allocated,
        });

        remainingQty -= allocated;
      }

      if (allocations.length > 0) {
        line.DocumentLinesBinAllocations = allocations;
        logger.info({
          allocationsCount: allocations.length,
          itemCode,
          msg: "Automatically resolved bin allocations for document line",
          warehouseCode,
        });
      }
    }
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to resolve bin allocations",
    });
  }
};

// Creates a new Sales Invoice (A/R Invoice) in SAP B1.
export const createInvoice = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
  try {
    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: payload.Comments,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      DocumentLines: lines.map((line) => {
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          VatGroup: line.VatGroup as string,
          WarehouseCode: line.WarehouseCode as string,
        };
        const uomEntry = Number(line.UoMEntry ?? line.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          docLine.UoMEntry = Math.trunc(uomEntry);
        } else {
          const uomCode = line.UoMCode ?? line.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
          }
        }

        if (Number.isFinite(line.BaseEntry) && Number.isFinite(line.BaseLine)) {
          docLine.BaseType = line.BaseType;
          docLine.BaseEntry = line.BaseEntry;
          docLine.BaseLine = line.BaseLine;
        }

        return docLine;
      }),
      NumAtCard: payload.NumAtCard,
      SalesPersonCode: payload.SalesPersonCode,
    };

    // Auto-allocate bin locations if dbName is provided and warehouse requires it
    const documentLines = (sapPayload.DocumentLines as Record<string, unknown>[]) ?? [];
    if (dbName && documentLines.length > 0) {
      await resolveBinAllocations(dbName, documentLines);
    }

    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }
    await adjustPayloadDates(sessionId, sapPayload);
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.slice(0, 4)}-${docDueDate.slice(
        4,
        6,
      )}-${docDueDate.slice(6, 8)}`;
    }

    logger.info({ msg: "DEBUG: SAP Invoice Payload", sapPayload });

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
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "A/R Invoice created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/R Invoice in Service Layer",
    });
    throw caughtError;
  }
};

// Updates allowed mutable fields on an existing A/R Invoice.
export const updateInvoice = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};

    if (Object.hasOwn(payload, "Comments")) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.DocDueDate) {
      sapPayload.DocDueDate = payload.DocDueDate;
      await adjustPayloadDates(sessionId, sapPayload, true, `/Invoices(${id})`);
    }
    if (Object.hasOwn(payload, "NumAtCard")) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }

    // Recalculate discount if document lines are provided
    if (Array.isArray(payload.DocumentLines)) {
      const lines = payload.DocumentLines as Record<string, unknown>[];

      sapPayload.DocumentLines = lines.map((line) => {
        const docLine: Record<string, unknown> = {
          LineNum: line.LineNum !== undefined ? Number(line.LineNum) : undefined,
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          VatGroup: line.VatGroup as string,
          WarehouseCode: line.WarehouseCode as string,
        };
        const uomEntry = Number(line.UoMEntry ?? line.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          docLine.UoMEntry = Math.trunc(uomEntry);
        } else {
          const uomCode = line.UoMCode ?? line.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
          }
        }
        return docLine;
      });
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/Invoices(${id})`, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Invalidate tenant-specific sales dashboard cache.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "A/R Invoice updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/R Invoice",
    });
    throw caughtError;
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

    return {
      message: "A/R Invoice canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/R Invoice",
    });
    throw caughtError;
  }
};

export const reopenInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Invoices(${id})/Reopen`);

    // Dashboard caches Must be purged to reflect the change.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "A/R Invoice reopened successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to reopen A/R Invoice",
    });
    throw caughtError;
  }
};

export const arInvoiceService = {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoiceByDocNum,
  getInvoiceDocNums,
  getInvoices,
  reopenInvoice,
  updateInvoice,
};
