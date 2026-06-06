// A/R Credit Memo Service: Logic for A/R Credit Memos (Sales Returns/Credits), combining HANA queries for listings and SAP Service Layer for document lifecycle.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { CreditNoteFilters } from "@/dal/types/ar-credit-memo.types";
import type { ArCreditMemo } from "@/db/schemas/ar-credit-memo.schema";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of A/R Credit Memos from HANA with dynamic filtering support.
export const getCreditNotes = async (dbName: string, filters: CreditNoteFilters) => {
  try {
    const repo = await getTenantRepository(dbName, ARCreditMemoSchema);
    const queryBuilder = repo.createQueryBuilder("cn");
    queryBuilder.where("1=1");

    // Dynamic Filter: Credit Note Number (DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(cn.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Customer Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("cn.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Customer Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(cn.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Date Range Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("cn.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Date Range End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("cn.docDate <= :endDate", {
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
      queryBuilder.andWhere("cn.docStatus = :status", {
        status: statusValue,
      });
    }
    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("cn.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("cn.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("cn.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "cn.cardCode",
      CardName: "cn.cardName",
      DocDate: "cn.docDate",
      DocNum: "cn.docNum",
      DocStatus: "cn.docStatus",
      DocTotal: "cn.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "cn.docDate": "DESC", "cn.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Handles pagination and sorting logic via unified PageService.
    const result = await PageService.getPagedData<ArCreditMemo>({
      dbName,
      entityName: "ArCreditMemos",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    // Maps database entities to standardized API response objects.
    return {
      ...result,
      data: result.data.map((data) => ({
        BalanceDue: Math.round((Number(data.docTotal) - Number(data.paidToDate || 0)) * 100) / 100,
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
    logger.error({
      db: dbName,
      error: caughtError.message,
      msg: "Failed to fetch A/R Credit Memos",
    });
    throw caughtError;
  }
};

export const getCreditNoteDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ARCreditMemoSchema);
  const queryBuilder = repo.createQueryBuilder("cn");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("cn.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(cn.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("cn.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Retrieves detailed data for a single A/R Credit Memo from the SAP Service Layer.
export const getCreditNote = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/CreditNotes(${id})`,
    )) as SAPDocumentResponse;

    // Normalize SAP internal status (bost_Open) to a single character code.
    return {
      Address: result.Address,
      Address2: result.Address2,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Comments: result.Comments,
      DocCurr: result.DocCurrency,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocNum: result.DocNum,
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      DocTotal: result.DocTotal,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        const normalized = normalizeSAPLineData(lineData);
        return {
          ...normalized,
          U_ReturnReason: lineData.U_ReturnReason || "",
        };
      }),
      NumAtCard: result.NumAtCard,
      SalesPersonCode: result.SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch A/R Credit Memo from Service Layer",
    });
    throw caughtError;
  }
};

// Creates a new Sales Credit Note (A/R Credit Memo) in SAP B1.
export const createCreditNote = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Map input payload to the canonical SAP Service Layer JSON structure for Credit Notes.

    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];

    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      Comments: payload.Comments,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      DocumentLines: lines.map((item) => {
        const line: Record<string, unknown> = {
          LineNum: item.LineNum !== undefined ? Number(item.LineNum) : undefined,
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          DiscountPercent: Number(item.DiscountPercent ?? 0), // SAP requires 0 to avoid double-discounting when Header Discount is used
          VatGroup: (item.VatGroup ?? item.TaxCode) as string,
          WarehouseCode: item.WarehouseCode as string,
        };

        // Prefer UoMEntry over UoMCode for more reliable linking in SAP
        if (item.UoMEntry !== undefined && item.UoMEntry !== null) {
          line.UoMEntry = Number(item.UoMEntry);
        } else if (item.UoMCode) {
          line.UoMCode = String(item.UoMCode);
        }

        // Only map Base document fields if they represent a valid SAP linking type (e.g. 13 for AR Invoice)
        if (item.BaseType !== undefined && item.BaseType !== null && Number(item.BaseType) !== -1) {
          line.BaseType = Number(item.BaseType);
          line.BaseEntry = Number(item.BaseEntry);
          line.BaseLine = Number(item.BaseLine);
        }
        // Map ReturnReason to the SAP UDF on each line
        if (item.U_ReturnReason) {
          line.U_ReturnReason = item.U_ReturnReason as string;
        }
        return line;
      }),
      NumAtCard: payload.NumAtCard,
      SalesPersonCode: payload.SalesPersonCode,
    };

    // Correct date formatting to YYYY-MM-DD.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }

    // Submit POST request to SAP for credit note creation.
    logger.info({
      cardCode: sapPayload.CardCode,
      docNum: payload.DocNum,
      lineCount: (sapPayload.DocumentLines as Record<string, unknown>[])?.length,
      lines: (sapPayload.DocumentLines as Record<string, unknown>[]).map((l, i) => ({
        index: i,
        ItemCode: l.ItemCode,
        Quantity: l.Quantity,
        BaseType: l.BaseType,
        BaseEntry: l.BaseEntry,
        BaseLine: l.BaseLine,
        UoMEntry: l.UoMEntry,
        VatGroup: l.VatGroup,
      })),
      msg: "Sending AR Credit Memo to SAP",
    });

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/CreditNotes",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge sales-related dashboard cache to ensure totals (including returns) are recalculated.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "A/R Credit Memo created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/R Credit Memo in Service Layer",
    });
    throw caughtError;
  }
};

// Updates metadata (Comments) on an existing A/R Credit Memo.
export const updateCreditNote = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Comments) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.NumAtCard !== undefined) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    // Partial update via PATCH.
    await serviceLayerClient.request(sessionId, "PATCH", `/CreditNotes(${id})`, sapPayload);

    // Invalidate tenant-specific sales dashboard cache.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { message: "A/R Credit Memo updated successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/R Credit Memo",
    });
    throw caughtError;
  }
};

// Executes the cancellation procedure for an A/R Credit Memo in SAP B1.
export const cancelCreditNote = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/CreditNotes(${id})/Cancel`);

    // Dashboard caches Must be purged to reflect the loss of revenue/receivables.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { message: "A/R Credit Memo cancelled successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/R Credit Memo",
    });
    throw caughtError;
  }
};

export const arCreditMemoService = {
  cancelCreditNote,
  createCreditNote,
  getCreditNote,
  getCreditNoteDocNums,
  getCreditNotes,
  updateCreditNote,
};
