// Sales Order Service: Orchestrates order processing flows. Interfaces with HANA for high-volume order queries and Service Layer for document lifecycle management (Creation, Update, Cancellation).

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getCachedData, purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { SalesOrderFilters } from "@/dal/types/sales-order.types";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { type SalesOrder, SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a filtered and paginated list of Sales Orders from the tenant-specific HANA database.
export const getSalesOrders = async (dbName: string, filters: SalesOrderFilters) => {
  try {
    const repo = await getTenantRepository(dbName, SalesOrderSchema);

    const queryBuilder = repo.createQueryBuilder("so");
    queryBuilder.where("1=1");

    // Dynamic Filter: Search by document number (Standard: DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(so.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Search by customer code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("so.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Search by customer name (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(so.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Order creation date Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("so.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Order creation date End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("so.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("so.docStatus = :status", {
        status: filters.DocStatus,
      });
    }
    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("so.docTotal = :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("so.docTotal < :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("so.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "so.docNum",
      DocDate: "so.docDate",
      CardCode: "so.cardCode",
      CardName: "so.cardName",
      DocTotal: "so.docTotal",
      DocStatus: "so.docStatus",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "so.docDate": "DESC", "so.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination and sorting defaults.
    const result = await PageService.getPagedData<SalesOrder>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "SalesOrders",
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
        DocStatus: data.docStatus,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw error;
  }
};

export const getSalesOrderDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, SalesOrderSchema);
  const queryBuilder = repo.createQueryBuilder("so");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("so.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(so.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("so.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Obtains the full Sales Order document structure from SAP, used for detail views.
export const getSalesOrder = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/Orders(${id})`,
    )) as SAPDocumentResponse;

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
      // normalizes SAP's internal string status.
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      Comments: result.Comments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => ({
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Quantity: line.Quantity,
        UoMCode: (line as unknown as Record<string, unknown>).UoMCode,
        UoMEntry: (line as unknown as Record<string, unknown>).UoMEntry,
        Price: line.Price || line.UnitPrice,
        DiscountPercent: line.DiscountPercent,
        TaxCode: line.TaxCode,
        WarehouseCode: line.WarehouseCode,
        LineTotal: line.LineTotal,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch sales order from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Resolves a Sales Order by DocNum from tenant DB and fetches full details from Service Layer.
export const getSalesOrderByDocNum = async (sessionId: string, dbName: string, docNum: string) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    throw new AppError("DocNum is required", 400, "VALIDATION_ERROR");
  }

  const repo = await getTenantRepository(dbName, SalesOrderSchema);
  const match = await repo
    .createQueryBuilder("so")
    .select(["so.docEntry"])
    .where("CAST(so.docNum AS NVARCHAR) = :docNum", { docNum: normalizedDocNum })
    .getOne();

  if (!match?.docEntry) {
    throw new AppError("Sales Order not found", 404, "NOT_FOUND");
  }

  return getSalesOrder(sessionId, String(match.docEntry));
};

// Posts a new Sales Order to the Service Layer using the /Orders endpoint.
export const createSalesOrder = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      SalesPersonCode: payload.SalesPersonCode,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      Comments: payload.Comments,
      Address: payload.Address,
      DocumentLines: (payload.DocumentLines as Record<string, unknown>[])?.map((line) => {
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          TaxCode: line.TaxCode as string,
          WarehouseCode: line.WarehouseCode as string,
          DiscountPercent: line.DiscountPercent as number,
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
    };

    // Standardize date into ISO format (YYYY-MM-DD) for Service Layer ingestion.
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
      "/Orders",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      msg: "Sales order created in SAP",
      docEntry: result.DocEntry,
      docNum: result.DocNum,
    });

    // Invalidate the sales dashboard cache as revenue and order counts have changed.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Sales Order created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to create sales order in Service Layer",
      error: error.message,
    });
    throw error;
  }
};

// PATCH request to update mutable document fields (Comments, Address, Lines).
export const updateSalesOrder = async (
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
      sapPayload.DocumentLines = lines.map((line) => {
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          TaxCode: line.TaxCode as string,
          WarehouseCode: line.WarehouseCode as string,
          DiscountPercent: line.DiscountPercent as number,
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
      });
    }

    logger.info({
      msg: "Sales order update payload prepared",
      id,
      changedFields: Object.keys(sapPayload),
      lineCount: Array.isArray(sapPayload.DocumentLines) ? sapPayload.DocumentLines.length : 0,
    });

    await serviceLayerClient.request(sessionId, "PATCH", `/Orders(${id})`, sapPayload);

    // Invalidate dashboard metrics to ensure real-time reporting accuracy.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Sales Order updated successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to update sales order in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Triggers the standard cancellation procedure in SAP B1 for the given Sales Order.
export const cancelSalesOrder = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Orders(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Sales Order canceled successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to cancel sales order in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Fetches the active list of Sales Employees (Sales Persons) from the tenant's HANA DB.
export const getSalesEmployees = async (dbName: string) => {
  const cacheKey = `master:${dbName}:SalesEmployees`;

  return getCachedData(
    cacheKey,
    async () => {
      try {
        const repository = await getTenantRepository(dbName, SalesEmployeeSchema);
        // Only active employees are returned to populate dropdowns correctly.
        const results = await repository.find({
          where: { Active: "Y" },
          order: { SlpCode: "ASC" },
          select: ["SlpCode", "SlpName"],
        });

        logger.info({ msg: "Sales Employees fetched (Fresh)", db: dbName, count: results?.length });

        return results.map((item) => ({
          id: item.SlpCode,
          code: item.SlpCode,
          name: item.SlpName,
        }));
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error({
          msg: "Failed to fetch sales employees from HANA",
          error: error.message,
          db: dbName,
        });
        const dbError = new Error(
          `Failed to retrieve sales employees: ${error.message}`,
        ) as Error & {
          statusCode?: number;
        };
        dbError.statusCode = 500;
        throw dbError;
      }
    },
    1000 * 60 * 10, // 10-minute cache TTL as personnel lists are relatively static.
  );
};

export const getOpenSalesOrderLines = async (sessionId: string, cardCode: string) => {
  try {
    const query = `/Orders?$filter=CardCode eq '${cardCode}' and DocumentStatus eq 'bost_Open'`;
    const result = (await serviceLayerClient.request(sessionId, "GET", query)) as {
      value: SAPDocumentResponse[];
    };

    const orders = result.value || [];
    const openLines: any[] = [];

    for (const order of orders) {
      const lines = order.DocumentLines || [];
      for (const line of lines) {
        if ((line as any).LineStatus === "bost_Open") {
          const l = line as any;
          openLines.push({
            DocEntry: order.DocEntry,
            DocNum: order.DocNum,
            DocDate: order.DocDate,
            DocCurr: order.DocCurrency,
            LineNum: l.LineNum,
            ItemCode: line.ItemCode,
            ItemDescription: line.ItemDescription,
            Quantity: line.Quantity,
            OpenQty: Number(l.OpenQuantity ?? l.RemainingOpenQuantity ?? l.RemainingOpenInventoryQuantity ?? l.RemainingQuantity ?? l.BaseOpenQuantity ?? line.Quantity),
            Price: line.Price || line.UnitPrice,
            TaxCode: line.TaxCode,
            WarehouseCode: line.WarehouseCode,
            UoMCode: l.UoMCode,
            UoMEntry: l.UoMEntry,
            DiscountPercent: line.DiscountPercent,
          });
        }
      }
    }

    logger.info({ msg: "DEBUG: Mapped Open Lines", count: openLines.length, samples: openLines.slice(0, 2) });

    return openLines;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch open sales order lines from Service Layer",
      error: error.message,
      cardCode,
    });
    throw error;
  }
};

export const salesOrderService = {
  getSalesOrders,
  getSalesOrderDocNums,
  getSalesOrder,
  getSalesOrderByDocNum,
  createSalesOrder,
  updateSalesOrder,
  cancelSalesOrder,
  getSalesEmployees,
  getOpenSalesOrderLines,
};
