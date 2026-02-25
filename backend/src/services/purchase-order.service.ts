// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PurchaseOrderFilters } from "@/dal/types/purchase-order.types";
// Data Access & Schemas
import { type PurchaseOrder, PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Retrieves a paginated list of Purchase Orders from the HANA database.
export const getPurchaseOrders = async (dbName: string, filters: PurchaseOrderFilters) => {
  try {
    const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
    const queryBuilder = repo.createQueryBuilder("po");

    queryBuilder.where("1=1");

    // Dynamic Filter: PO Document Number search.
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(po.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Vendor Code search (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("po.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Vendor Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(po.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Execution Date Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("po.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Execution Date End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("po.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("po.docStatus = :status", {
        status: filters.DocStatus,
      });
    }

    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("po.docTotal = :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("po.docTotal < :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("po.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "po.docNum",
      DocDate: "po.docDate",
      CardCode: "po.cardCode",
      CardName: "po.cardName",
      DocTotal: "po.docTotal",
      DocStatus: "po.docStatus",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "po.docDate": "DESC", "po.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination and sorting.
    const result = await PageService.getPagedData<PurchaseOrder>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "PurchaseOrders",
      dbName,
    });

    // Maps internal TypeORM entities to a standardized API response format.
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
        DocStatus: data.docStatus === "O" ? "Open" : "Closed",
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw error;
  }
};

// Returns distinct DocNum values for lookup/search popup.
export const getPurchaseOrderDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
  const queryBuilder = repo.createQueryBuilder("po");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("po.docNum", "DocNum").distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(po.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }

  queryBuilder.orderBy("po.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();

  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Requests a specific PO document from the Service Layer, including item lines.
export const getPurchaseOrder = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders(${id})`,
    )) as SAPDocumentResponse;

    // Normalizes SAP status (bost_Open) to a single character (O/C) for the internal logic.
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
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      Comments: result.Comments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => ({
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Quantity: line.Quantity,
        Price: line.Price || line.UnitPrice,
        DiscountPercent: line.DiscountPercent,
        UoMCode: (line as unknown as Record<string, unknown>).UoMCode,
        UoMEntry: (line as unknown as Record<string, unknown>).UoMEntry,
        WarehouseCode: line.WarehouseCode,
        TaxCode: line.TaxCode,
        LineTotal: line.LineTotal,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch purchase order from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Resolves a PO by DocNum from tenant DB and fetches full details from Service Layer.
export const getPurchaseOrderByDocNum = async (
  sessionId: string,
  dbName: string,
  docNum: string,
) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    throw new AppError("DocNum is required", 400, "VALIDATION_ERROR");
  }

  const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
  const match = await repo
    .createQueryBuilder("po")
    .select(["po.docEntry"])
    .where("CAST(po.docNum AS NVARCHAR) = :docNum", { docNum: normalizedDocNum })
    .getOne();

  if (!match?.docEntry) {
    throw new AppError("Purchase Order not found", 404, "NOT_FOUND");
  }

  return getPurchaseOrder(sessionId, String(match.docEntry));
};

// Submits a new Purchase Order to SAP B1.
export const createPurchaseOrder = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const inputLines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const linesMissingUom = inputLines
      .map((line) => ({
        itemCode: String(line.ItemCode ?? "").trim(),
        uomCode: String(line.UoMCode ?? line.UomCode ?? "").trim(),
        uomEntry: Number(line.UoMEntry ?? line.UomEntry),
      }))
      .filter((line) => !line.uomCode && !Number.isFinite(line.uomEntry));

    if (linesMissingUom.length > 0) {
      const missingItems = linesMissingUom.map((line) => line.itemCode || "<unknown>");
      logger.warn({
        msg: "Purchase order payload has lines without UoMCode/UoMEntry",
        missingItems,
      });
      throw new AppError(
        `Missing UoM for item(s): ${missingItems.join(", ")}`,
        400,
        "VALIDATION_ERROR",
      );
    }

    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      SalesPersonCode: payload.SalesPersonCode,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      Comments: payload.Comments,
      Address: payload.Address,
      DocumentLines: (payload.DocumentLines as Record<string, unknown>[])?.map((item) => {
        const docLine: Record<string, unknown> = {
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          TaxCode: item.TaxCode as string,
          WarehouseCode: item.WarehouseCode as string,
          DiscountPercent: item.DiscountPercent as number,
        };
        const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          docLine.UoMEntry = Math.trunc(uomEntry);
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
          }
        }

        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          docLine.BaseType = item.BaseType;
          docLine.BaseEntry = item.BaseEntry;
          docLine.BaseLine = item.BaseLine;
        }

        return docLine;
      }),
    };

    logger.info({
      msg: "Purchase order line UoM payload",
      lines: ((sapPayload.DocumentLines as Record<string, unknown>[]) || []).map((line) => ({
        ItemCode: String(line.ItemCode ?? ""),
        UoMCode: String(line.UoMCode ?? "").trim(),
        UoMEntry:
          typeof line.UoMEntry === "number" && Number.isFinite(line.UoMEntry)
            ? line.UoMEntry
            : undefined,
        WarehouseCode: String(line.WarehouseCode ?? "").trim(),
      })),
    });

    // Formats DocDate into SAP-compliant YYYY-MM-DD.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.substring(0, 4)}-${docDueDate.substring(
        4,
        6,
      )}-${docDueDate.substring(6, 8)}`;
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseOrders",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      msg: "Purchase order created in SAP",
      docEntry: result.DocEntry,
      docNum: result.DocNum,
    });

    // Invalidate the procurement dashboard metrics for this tenant.
    const dbName = result.CompanyDB || result.DBName;
    if (dbName) {
      purgeCache(`dash:purchase:${dbName}:`);
    }

    return {
      success: true,
      message: "Purchase Order created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to create purchase order in Service Layer",
      error: error.message,
    });
    throw error;
  }
};

// PATCH request to update mutable fields (Comments, DueDate) on an existing PO.
export const updatePurchaseOrder = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};

    if (payload.Comments !== undefined) sapPayload.Comments = payload.Comments;
    if (payload.Address !== undefined) sapPayload.Address = payload.Address;
    if (payload.DocDate !== undefined) sapPayload.DocDate = payload.DocDate;
    if (payload.DocDueDate !== undefined) sapPayload.DocDueDate = payload.DocDueDate;
    if (payload.SalesPersonCode !== undefined) sapPayload.SalesPersonCode = payload.SalesPersonCode;

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      sapPayload.DocumentLines = lines.map((item) => {
        const docLine: Record<string, unknown> = {
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          TaxCode: item.TaxCode as string,
          WarehouseCode: item.WarehouseCode as string,
          DiscountPercent: item.DiscountPercent as number,
        };
        const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          docLine.UoMEntry = Math.trunc(uomEntry);
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
          }
        }

        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          docLine.BaseType = item.BaseType;
          docLine.BaseEntry = item.BaseEntry;
          docLine.BaseLine = item.BaseLine;
        }

        return docLine;
      });
    }

    logger.info({
      msg: "Purchase order update payload prepared",
      id,
      changedFields: Object.keys(sapPayload),
      lineCount: Array.isArray(sapPayload.DocumentLines) ? sapPayload.DocumentLines.length : 0,
    });

    await serviceLayerClient.request(sessionId, "PATCH", `/PurchaseOrders(${id})`, sapPayload);

    // Dashboard metrics must be refreshed to reflect potential total spend changes.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Purchase Order updated successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to update purchase order in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Triggers the cancellation workflow for a PO in SAP.
export const cancelPurchaseOrder = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseOrders(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Purchase Order cancelled successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to cancel purchase order in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

export const purchaseOrderService = {
  getPurchaseOrders,
  getPurchaseOrderDocNums,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
  createPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
};
