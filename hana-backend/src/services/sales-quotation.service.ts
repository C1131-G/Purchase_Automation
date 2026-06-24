// Sales Quotation Service: Orchestrates quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { SalesQuotationFilters } from "@/dal/types/sales-quotation.types";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { SalesQuotationLineSchema } from "@/db/schemas/sales-quotation-line.schema";
import type { SalesQuotation } from "@/db/schemas/sales-quotation.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { adjustPayloadDates } from "./date-adjustment.util";
import { attachmentsService } from "./attachments.service";

// Fetches a filtered and paginated list of Sales Quotations from the tenant-specific HANA database.
export const getSalesQuotations = async (dbName: string, filters: SalesQuotationFilters) => {
  try {
    const repo = await getTenantRepository(dbName, SalesQuotationSchema);

    const queryBuilder = repo.createQueryBuilder("sq");
    queryBuilder.where("1=1");

    // Dynamic Filter: Search by document number (Standard: DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(sq.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Search by customer code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("sq.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Search by customer name (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(sq.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Order creation date Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("sq.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Order creation date End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("sq.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("sq.docStatus = :status", {
        status: filters.DocStatus,
      });
    }
    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("sq.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("sq.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("sq.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "sq.cardCode",
      CardName: "sq.cardName",
      DocDate: "sq.docDate",
      DocNum: "sq.docNum",
      DocStatus: "sq.docStatus",
      DocTotal: "sq.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "sq.docDate": "DESC", "sq.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination and sorting defaults.
    const result = await PageService.getPagedData<SalesQuotation>({
      dbName,
      entityName: "SalesQuotations",
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
        DocStatus: data.docStatus === "O" ? "Open" : "Closed",
        DocTotal: data.docTotal,
        Address: data.address,
        Address2: data.address2,
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

export const getSalesQuotationDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, SalesQuotationSchema);
  const queryBuilder = repo.createQueryBuilder("sq");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("sq.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(sq.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("sq.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Obtains the full Sales Quotation document structure from SAP, used for detail views.
export const getSalesQuotation = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/Quotations(${id})`,
    )) as SAPDocumentResponse;

    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    const attachments = dbName
      ? await attachmentsService.getLocalAttachments(dbName, "SalesQuotation", result.DocEntry)
      : [];

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
      Address2: result.Address2,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      // normalizes SAP's internal string status.
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      Comments: result.Comments,
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard ?? "",
      attachments,
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
      msg: "Failed to fetch sales quotation from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a Sales Quotation by DocNum from tenant DB and fetches full details from Service Layer.
export const getSalesQuotationByDocNum = async (
  sessionId: string,
  dbName: string,
  docNum: string,
) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    throw new AppError("DocNum is required", 400, "VALIDATION_ERROR");
  }

  const repo = await getTenantRepository(dbName, SalesQuotationSchema);
  const match = await repo
    .createQueryBuilder("sq")
    .select(["sq.docEntry"])
    .where("CAST(sq.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (!match?.docEntry) {
    throw new AppError("Sales Quotation not found", 404, "NOT_FOUND");
  }

  return getSalesQuotation(sessionId, String(match.docEntry));
};

// Posts a new Sales Quotation to the Service Layer using the /Quotations endpoint.
export const createSalesQuotation = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: payload.Comments,
      NumAtCard: payload.NumAtCard,
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
          docLine.UseBaseUnit = "tNO";
        } else {
          const uomCode = line.UoMCode ?? line.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
            docLine.UseBaseUnit = "tNO";
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
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    // Standardize date into ISO format (YYYY-MM-DD) for Service Layer ingestion.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }
    await adjustPayloadDates(sessionId, sapPayload, false, undefined, "Valid until date");
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
      "/Quotations",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      msg: "Sales quotation created in SAP",
    });

    // Invalidate the sales dashboard cache as revenue and quotation counts have changed.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
      if (attachments && attachments.length > 0) {
        const finalized = await attachmentsService.finalizeAttachments(
          session.companyDB,
          "SalesQuotation",
          result.DocNum,
          attachments,
        );
        await attachmentsService.saveLocalAttachments(
          session.companyDB,
          "SalesQuotation",
          result.DocEntry,
          finalized,
        );
      }
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "Sales Quotation created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create sales quotation in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable document fields (Comments, Address, Lines).
export const updateSalesQuotation = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        let docNum: string | number = id;
        try {
          const docData = await serviceLayerClient.request<any>(
            sessionId,
            "GET",
            `/Quotations(${id})?$select=DocNum`,
          );
          if (docData?.DocNum) {
            docNum = docData.DocNum;
          }
        } catch (err: any) {
          logger.warn({ id, err: err.message }, "Failed to fetch DocNum for renaming attachments");
        }

        const attachments = payload.attachments as any[];
        const finalized = await attachmentsService.finalizeAttachments(
          dbName,
          "SalesQuotation",
          docNum,
          attachments || [],
        );
        await attachmentsService.saveLocalAttachments(dbName, "SalesQuotation", id, finalized);
      }
    }

    if (payload.Comments !== undefined) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.NumAtCard !== undefined) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }
    if (payload.Address !== undefined) {
      sapPayload.Address = payload.Address;
    }
    if (payload.Address2 !== undefined) {
      sapPayload.Address2 = payload.Address2;
    }
    if (payload.DocDate !== undefined) {
      sapPayload.DocDate = payload.DocDate;
    }
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
      await adjustPayloadDates(
        sessionId,
        sapPayload,
        true,
        `/Quotations(${id})`,
        "Valid until date",
      );
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
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
          docLine.UseBaseUnit = "tNO";
        } else {
          const uomCode = line.UoMCode ?? line.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
            docLine.UseBaseUnit = "tNO";
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
      msg: "Sales quotation update payload prepared",
    });

    await serviceLayerClient.request(sessionId, "PATCH", `/Quotations(${id})`, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Invalidate dashboard metrics to ensure real-time reporting accuracy.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "Sales Quotation updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update sales quotation in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the standard cancellation procedure in SAP B1 for the given Sales Quotation.
export const cancelSalesQuotation = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Quotations(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "Sales Quotation canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel sales quotation in Service Layer",
    });
    throw caughtError;
  }
};

export const getOpenSalesQuotationLines = async (dbName: string, cardCode: string) => {
  try {
    logger.info({ cardCode, dbName, msg: "Fetching Open SQ Lines via HANA" });

    // Query HANA QUT1 (quotation lines) joined with OQUT (quotation header).
    // QUT1.OpenQty is the SAP-maintained remaining open quantity — it decrements automatically
    // as Sales Orders or AR Invoices are created against the quotation.
    const headerRepo = await getTenantRepository(dbName, SalesQuotationSchema);
    const rows = (await headerRepo
      .createQueryBuilder("h")
      .innerJoin(SalesQuotationLineSchema as any, "l", '"l"."DocEntry" = "h"."DocEntry"')
      .select([
        '"h"."DocEntry"   AS "DocEntry"',
        '"h"."DocNum"     AS "DocNum"',
        '"h"."DocDate"    AS "DocDate"',
        '"h"."DocCur"     AS "DocCurr"',
        '"h"."DiscPrcnt"  AS "HeaderDiscountPercent"',
        '"l"."LineNum"    AS "LineNum"',
        '"l"."ItemCode"   AS "ItemCode"',
        '"l"."Dscription" AS "ItemDescription"',
        '"l"."Quantity"   AS "Quantity"',
        '"l"."OpenQty"    AS "OpenQty"',
        '"l"."Price"      AS "Price"',
        '"l"."PriceBefDi" AS "PriceBefDi"',
        '"l"."VatGroup"   AS "VatGroup"',
        '"l"."VatPrcnt"   AS "VatPrcnt"',
        '"l"."WhsCode"    AS "WarehouseCode"',
        '"l"."UomCode"    AS "UoMCode"',
        '"l"."UomEntry"   AS "UoMEntry"',
        '"l"."DiscPrcnt"  AS "DiscountPercent"',
        '"l"."LineTotal"  AS "LineTotal"',
      ])
      .where('"h"."CardCode" = :cardCode', { cardCode })
      .andWhere('"h"."DocStatus" = :docStatus', { docStatus: "O" })
      .andWhere('"l"."OpenQty" > 0')
      .orderBy('"h"."DocNum"', "DESC")
      .addOrderBy('"l"."LineNum"', "ASC")
      .getRawMany()) as Record<string, unknown>[];

    const openLines = rows.map((row) => {
      const normalized = normalizeSAPLineData(row);
      const headerDiscountPercent = Number(row["HeaderDiscountPercent"] ?? 0);
      return {
        DiscountPercent: normalized.DiscountPercent || headerDiscountPercent,
        DocCurr: String(row["DocCurr"] ?? ""),
        DocDate: String(row["DocDate"] ?? ""),
        DocEntry: Number(row["DocEntry"]),
        DocNum: Number(row["DocNum"]),
        ItemCode: normalized.ItemCode,
        ItemDescription: normalized.ItemDescription,
        LineNum: normalized.LineNum,
        LineTotal: normalized.LineTotal,
        OpenQty: normalized.OpenQty,
        Price: normalized.Price,
        Quantity: normalized.Quantity,
        UoMCode: normalized.UoMCode,
        UoMEntry: normalized.UoMEntry,
        VatGroup: normalized.VatGroup,
        VatPrcnt: normalized.VatPrcnt,
        WarehouseCode: normalized.WarehouseCode,
      };
    });

    logger.info({ count: openLines.length, msg: "Open SQ lines from HANA" });

    return openLines;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      cardCode,
      error: caughtError.message,
      msg: "Failed to fetch open SQ lines from HANA",
    });
    throw caughtError;
  }
};

export const salesQuotationService = {
  cancelSalesQuotation,
  createSalesQuotation,
  getOpenSalesQuotationLines,
  getSalesQuotation,
  getSalesQuotationByDocNum,
  getSalesQuotationDocNums,
  getSalesQuotations,
  updateSalesQuotation,
};
