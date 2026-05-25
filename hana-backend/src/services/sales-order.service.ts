// Sales Order Service: Orchestrates order processing flows. Interfaces with HANA for high-volume order queries and Service Layer for document lifecycle management (Creation, Update, Cancellation).

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getCachedData, purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { SalesOrderFilters } from "@/dal/types/sales-order.types";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import type { SalesOrder } from "@/db/schemas/sales-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { calculateHeaderDiscount } from "@/services/discount.util";
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
        queryBuilder.andWhere("so.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("so.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("so.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "so.cardCode",
      CardName: "so.cardName",
      DocDate: "so.docDate",
      DocNum: "so.docNum",
      DocStatus: "so.docStatus",
      DocTotal: "so.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "so.docDate": "DESC", "so.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination and sorting defaults.
    const result = await PageService.getPagedData<SalesOrder>({
      dbName,
      entityName: "SalesOrders",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    return {
      ...result,
      data: result.data.map((data) => ({
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocCurr: data.docCurr,
        DocDate: data.docDate,
        DocNum: data.docNum,
        DocStatus: data.docStatus,
        DocTotal: data.docTotal,
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
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
      DiscountPercent: result.DiscountPercent,
      DiscountAmount: result.TotalDiscount ?? 0,
      // normalizes SAP's internal string status.
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      Comments: result.Comments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        return normalizeSAPLineData(lineData);
      }),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch sales order from Service Layer",
    });
    throw caughtError;
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
    .where("CAST(so.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (!match?.docEntry) {
    throw new AppError("Sales Order not found", 404, "NOT_FOUND");
  }

  return getSalesOrder(sessionId, String(match.docEntry));
};

// Posts a new Sales Order to the Service Layer using the /Orders endpoint.
export const createSalesOrder = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const discountData = calculateHeaderDiscount(
      lines.map((l) => ({
        price: ((l.PriceBefDi || l.UnitPrice || l.Price) as number) || 0,
        quantity: (l.Quantity as number) || 1,
        discountPercent: (l.DiscountPercent as number) || (l.DiscPrcnt as number) || 0,
      })),
    );
    const roundedHeaderDiscount = discountData.percent;
    const roundedHeaderDiscountAmount = discountData.amount;

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      CardCode: payload.CardCode,
      Comments: payload.Comments,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      DiscountPercent: roundedHeaderDiscount,
      DiscountAmount: roundedHeaderDiscountAmount,
      DocumentLines: lines.map((line) => {
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
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
      SalesPersonCode: payload.SalesPersonCode,
    };

    // Standardize date into ISO format (YYYY-MM-DD) for Service Layer ingestion.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.slice(0, 4)}-${docDueDate.slice(
        4,
        6,
      )}-${docDueDate.slice(6, 8)}`;
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/Orders",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      msg: "Sales order created in SAP",
    });

    // Invalidate the sales dashboard cache as revenue and order counts have changed.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "Sales Order created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create sales order in Service Layer",
    });
    throw caughtError;
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

    if (payload.Comments !== undefined) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.Address !== undefined) {
      sapPayload.Address = payload.Address;
    }
    if (payload.DocDate !== undefined) {
      sapPayload.DocDate = payload.DocDate;
    }
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      const discountData = calculateHeaderDiscount(
        lines.map((l) => ({
          price: ((l.UnitPrice || l.Price) as number) || 0,
          quantity: (l.Quantity as number) || 1,
          discountPercent: (l.DiscountPercent as number) || 0,
        })),
      );
      sapPayload.DiscountPercent = discountData.percent;
      sapPayload.DiscountAmount = discountData.amount;

      sapPayload.DocumentLines = lines.map((line) => {
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          VatGroup: line.VatGroup as string,
          WarehouseCode: line.WarehouseCode ?? ((line as any).WhsCode as string),
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
      changedFields: Object.keys(sapPayload),
      id,
      lineCount: Array.isArray(sapPayload.DocumentLines) ? sapPayload.DocumentLines.length : 0,
      msg: "Sales order update payload prepared",
    });

    await serviceLayerClient.request(sessionId, "PATCH", `/Orders(${id})`, sapPayload);

    // Invalidate dashboard metrics to ensure real-time reporting accuracy.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "Sales Order updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update sales order in Service Layer",
    });
    throw caughtError;
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
      message: "Sales Order canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel sales order in Service Layer",
    });
    throw caughtError;
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
          order: { SlpCode: "ASC" },
          select: ["SlpCode", "SlpName"],
          where: { Active: "Y" },
        });

        logger.info({
          count: results?.length,
          db: dbName,
          msg: "Sales Employees fetched (Fresh)",
        });

        return results.map((item) => ({
          code: item.SlpCode,
          id: item.SlpCode,
          name: item.SlpName,
        }));
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          db: dbName,
          error: caughtError.message,
          msg: "Failed to fetch sales employees from HANA",
        });
        const dbError = new Error(
          `Failed to retrieve sales employees: ${caughtError.message}`,
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
    const openLines: {
      DocEntry: number;
      DocNum: number;
      DocDate: string;
      DocCurr: string;
      LineNum: number;
      ItemCode: string;
      ItemDescription?: string;
      Quantity: number;
      OpenQty: number;
      Price?: number;
      TaxCode?: string;
      WarehouseCode?: string;
      UoMCode?: string | number;
      UoMEntry?: number;
      DiscountPercent?: number;
      VatGroup?: string;
      VatPrcnt?: number;
    }[] = [];

    for (const order of orders) {
      const lines = order.DocumentLines || [];
      for (const line of lines) {
        const lineWithStatus = line as SAPDocumentLine & {
          LineStatus?: string;
        };
        if (lineWithStatus.LineStatus === "bost_Open") {
          const lineWithOpenQty = lineWithStatus as SAPDocumentLine & {
            LineStatus?: string;
            OpenQuantity?: number;
            RemainingOpenQuantity?: number;
            RemainingOpenInventoryQuantity?: number;
            RemainingQuantity?: number;
            BaseOpenQuantity?: number;
            UoMCode?: string | number;
            UoMEntry?: number;
          };
          openLines.push({
            DiscountPercent: line.DiscountPercent || order.DiscountPercent,
            DocCurr: order.DocCurrency,
            DocDate: order.DocDate,
            DocEntry: order.DocEntry,
            DocNum: order.DocNum,
            ItemCode: line.ItemCode,
            ItemDescription: line.ItemDescription,
            LineNum: lineWithOpenQty.LineNum ?? 0,
            OpenQty: Number(
              lineWithOpenQty.OpenQuantity ??
                lineWithOpenQty.RemainingOpenQuantity ??
                lineWithOpenQty.RemainingOpenInventoryQuantity ??
                lineWithOpenQty.RemainingQuantity ??
                lineWithOpenQty.BaseOpenQuantity ??
                line.Quantity,
            ),
            Price: line.Price || line.UnitPrice,
            Quantity: line.Quantity,
            UoMCode: lineWithOpenQty.UoMCode,
            UoMEntry: lineWithOpenQty.UoMEntry,
            VatGroup: lineWithOpenQty.VatGroup || String(lineWithOpenQty.TaxCode ?? "").trim(),
            VatPrcnt: Number(lineWithOpenQty.TaxPercentagePerRow ?? lineWithOpenQty.VatPrcnt ?? 0),
            WarehouseCode: line.WarehouseCode,
          });
        }
      }
    }

    logger.info({
      count: openLines.length,
      msg: "DEBUG: Mapped Open Lines",
      samples: openLines.slice(0, 2),
    });

    return openLines;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      cardCode,
      error: caughtError.message,
      msg: "Failed to fetch open sales order lines from Service Layer",
    });
    throw caughtError;
  }
};

export const salesOrderService = {
  cancelSalesOrder,
  createSalesOrder,
  getOpenSalesOrderLines,
  getSalesEmployees,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesOrderDocNums,
  getSalesOrders,
  updateSalesOrder,
};
