// Purchase Quotation Service: Orchestrates vendor quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PurchaseQuotationFilters } from "@/dal/types/purchase-quotation.types";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { PurchaseQuotationLineSchema } from "@/db/schemas/purchase-quotation-line.schema";
import type { PurchaseQuotation } from "@/db/schemas/purchase-quotation.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { calculateHeaderDiscount } from "@/services/discount.util";
import { serviceLayerClient } from "@/services/service-layer.service";
import { adjustPayloadDates } from "./date-adjustment.util";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

const normalizeSapDateValue = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw.slice(0, 10);
};

// Fetches a filtered and paginated list of Purchase Quotations from the tenant-specific HANA database.
export const getPurchaseQuotations = async (dbName: string, filters: PurchaseQuotationFilters) => {
  try {
    const repo = await getTenantRepository(dbName, PurchaseQuotationSchema);

    const queryBuilder = repo.createQueryBuilder("pq");
    queryBuilder.where("1=1");

    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(pq.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    if (filters.CardCode) {
      queryBuilder.andWhere("pq.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(pq.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    if (filters.DocDateStart) {
      queryBuilder.andWhere("pq.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    if (filters.DocDateEnd) {
      queryBuilder.andWhere("pq.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    if (filters.DocStatus) {
      queryBuilder.andWhere("pq.docStatus = :status", {
        status: filters.DocStatus,
      });
    }

    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("pq.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("pq.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("pq.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "pq.cardCode",
      CardName: "pq.cardName",
      DocDate: "pq.docDate",
      DocNum: "pq.docNum",
      DocStatus: "pq.docStatus",
      DocTotal: "pq.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "pq.docDate": "DESC", "pq.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    const result = await PageService.getPagedData<PurchaseQuotation>({
      dbName,
      entityName: "PurchaseQuotations",
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
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

export const getPurchaseQuotationDocNums = async (
  dbName: string,
  search?: string,
  limit?: number,
) => {
  const repo = await getTenantRepository(dbName, PurchaseQuotationSchema);
  const queryBuilder = repo.createQueryBuilder("pq");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("pq.docNum", "DocNum")
    .addSelect("pq.cardCode", "CardCode")
    .addSelect("pq.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(pq.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("pq.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    DocNum: number | string;
    CardCode?: string;
    CardName?: string;
  }>();

  return rows
    .map((row) => ({
      code: String(row.DocNum).trim(),
      name: row.CardCode
        ? `[${row.CardCode}] ${row.CardName || ""}`.trim()
        : String(row.DocNum).trim(),
    }))
    .filter((item) => item.code.length > 0);
};

// Obtains the full Purchase Quotation document structure from SAP, used for detail views.
export const getPurchaseQuotation = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseQuotations(${id})`,
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
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      Comments: result.Comments,
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard ?? "",
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        const normalized = normalizeSAPLineData(lineData);
        // PQT1.PQTReqQty is the user-entered quantity on a Purchase Quotation,
        // while PQT1.Quantity stays 0 by design. Surface RequiredQuantity as
        // Quantity in the API response so the vendor portal edit/copy-from
        // hydration reads the same value the user originally entered.
        // Do not overwrite OpenQty here: SAP's real OpenQty must flow through
        // unchanged so that downstream copy-to cascades (PO/GRPO/AP Invoice)
        // can use the actual remaining quantity for partial-fulfillment checks.
        const requiredQuantity = Number(
          lineData.RequiredQuantity ?? lineData.requiredQuantity ?? 0,
        );
        if (requiredQuantity > 0) {
          normalized.Quantity = requiredQuantity;
        }
        return normalized;
      }),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch purchase quotation from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a Purchase Quotation by DocNum from tenant DB and fetches full details from Service Layer.
export const getPurchaseQuotationByDocNum = async (
  sessionId: string,
  dbName: string,
  docNum: string,
) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    throw new AppError("DocNum is required", 400, "VALIDATION_ERROR");
  }

  const repo = await getTenantRepository(dbName, PurchaseQuotationSchema);
  const match = await repo
    .createQueryBuilder("pq")
    .select(["pq.docEntry"])
    .where("CAST(pq.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (!match?.docEntry) {
    throw new AppError("Purchase Quotation not found", 404, "NOT_FOUND");
  }

  return getPurchaseQuotation(sessionId, String(match.docEntry));
};

// Posts a new Purchase Quotation to the Service Layer using the /PurchaseQuotations endpoint.
export const createPurchaseQuotation = async (
  sessionId: string,
  payload: Record<string, unknown>,
) => {
  try {
    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const discountData = calculateHeaderDiscount(
      lines.map((l) => ({
        price: ((l.UnitPrice || l.Price) as number) || 0,
        quantity: (l.Quantity as number) || 1,
        discountPercent: (l.DiscountPercent as number) || 0,
      })),
    );
    const roundedHeaderDiscount = discountData.percent;
    const roundedHeaderDiscountAmount = discountData.amount;

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      CardCode: payload.CardCode,
      Comments: payload.Comments,
      NumAtCard: payload.NumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      RequriedDate:
        (payload as Record<string, unknown>).RequriedDate ?? payload.DocDueDate ?? payload.DocDate,
      DiscountPercent: roundedHeaderDiscount,
      DiscountAmount: roundedHeaderDiscountAmount,
      DocumentLines: lines.map((line) => {
        // PQT1.Quantity drives LineTotal / DocTotal computation in SAP.
        // PQT1.PQTReqQty carries the user-entered required quantity semantic
        // requested by the vendor portal flow.
        // PQT1.ShipDate mirrors PQT1.ReqDate so the quoted shipping date
        // matches the user-entered required date in the vendor portal flow.
        const reqDate = normalizeSapDateValue(
          line.ReqDate ??
            line.RequiredDate ??
            line.requiredDate ??
            payload.DocDueDate ??
            payload.DocDate,
        );
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: Number(line.Quantity ?? 0),
          RequiredQuantity: Number(line.Quantity ?? 0),
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: 0, // SAP requires 0 to avoid double-discounting when Header Discount is used
          ReqDate: reqDate,
          ShipDate: reqDate,
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
    const requiredDate = sapPayload.RequriedDate as string;
    if (requiredDate && requiredDate.length === 8) {
      sapPayload.RequriedDate = `${requiredDate.slice(0, 4)}-${requiredDate.slice(
        4,
        6,
      )}-${requiredDate.slice(6, 8)}`;
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseQuotations",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      msg: "Purchase quotation created in SAP",
    });

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "Purchase Quotation created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable document fields (Comments, Address, Lines).
export const updatePurchaseQuotation = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};

    if (payload.Comments !== undefined) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.NumAtCard !== undefined) {
      sapPayload.NumAtCard = payload.NumAtCard;
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
    if ((payload as Record<string, unknown>).RequriedDate !== undefined) {
      sapPayload.RequriedDate = (payload as Record<string, unknown>).RequriedDate;
    }
    await adjustPayloadDates(sessionId, sapPayload, true, `/PurchaseQuotations(${id})`);
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      const discountData = calculateHeaderDiscount(
        lines.map((l) => ({
          price: ((l.UnitPrice || l.Price) as number) || 0,
          quantity: (l.Quantity as number) || 1,
          discountPercent: (l.DiscountPercent as number) || (l.DiscPrcnt as number) || 0,
        })),
      );
      sapPayload.DiscountPercent = discountData.percent;
      sapPayload.DiscountAmount = discountData.amount;

      sapPayload.DocumentLines = lines.map((line) => {
        // Mirror the create path: drive DocTotal via PQT1.Quantity,
        // carry the required-qty semantic in PQT1.PQTReqQty, and keep
        // PQT1.ShipDate in lockstep with PQT1.ReqDate.
        const reqDate = normalizeSapDateValue(
          line.ReqDate ??
            line.RequiredDate ??
            line.requiredDate ??
            payload.DocDueDate ??
            payload.DocDate,
        );
        const docLine: Record<string, unknown> = {
          LineNum: line.LineNum !== undefined ? Number(line.LineNum) : undefined,
          ItemCode: line.ItemCode as string,
          Quantity: Number(line.Quantity ?? 0),
          RequiredQuantity: Number(line.Quantity ?? 0),
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: 0, // SAP requires 0 to avoid double-discounting when Header Discount is used
          ReqDate: reqDate,
          ShipDate: reqDate,
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
      });
    }

    logger.info({
      changedFields: Object.keys(sapPayload),
      id,
      lineCount: Array.isArray(sapPayload.DocumentLines) ? sapPayload.DocumentLines.length : 0,
      msg: "Purchase quotation update payload prepared",
    });

    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      `/PurchaseQuotations(${id})`,
      sapPayload,
      true,
      {
        "B1S-ReplaceCollectionsOnPatch": "true",
      },
    );

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "Purchase Quotation updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the standard cancellation procedure in SAP B1 for the given Purchase Quotation.
export const cancelPurchaseQuotation = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseQuotations(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "Purchase Quotation canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

export const getOpenPurchaseQuotationLines = async (dbName: string, cardCode: string) => {
  try {
    logger.info({ cardCode, dbName, msg: "Fetching Open PQ Lines via HANA" });

    const headerRepo = await getTenantRepository(dbName, PurchaseQuotationSchema);
    const rows = (await headerRepo
      .createQueryBuilder("h")
      .innerJoin(PurchaseQuotationLineSchema as any, "l", '"l"."DocEntry" = "h"."DocEntry"')
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

    logger.info({ count: openLines.length, msg: "Open PQ lines from HANA" });

    return openLines;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      cardCode,
      error: caughtError.message,
      msg: "Failed to fetch open PQ lines from HANA",
    });
    throw caughtError;
  }
};

export const purchaseQuotationService = {
  cancelPurchaseQuotation,
  createPurchaseQuotation,
  getOpenPurchaseQuotationLines,
  getPurchaseQuotation,
  getPurchaseQuotationByDocNum,
  getPurchaseQuotationDocNums,
  getPurchaseQuotations,
  updatePurchaseQuotation,
};
