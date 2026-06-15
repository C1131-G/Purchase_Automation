// A/P Credit Memo Service: Logic for A/P Credit Memos, combining HANA database queries for lists and SAP Service Layer for detailed document operations.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { CreditNoteFilters } from "@/dal/types/ap-credit-memo.types";
import type { APCreditMemo } from "@/db/schemas/ap-credit-memo.schema";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of A/P Credit Memos from HANA.
// Uses TypeORM's query builder to construct dynamic filters based on user search criteria.
export const getCreditNotes = async (dbName: string, filters: CreditNoteFilters) => {
  try {
    const repo = await getTenantRepository(dbName, APCreditMemoSchema);
    const queryBuilder = repo.createQueryBuilder("cn");
    queryBuilder.where("1=1");

    // Dynamic Filter: Credit Note Number (DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(cn.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Vendor Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("cn.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Vendor Name search (Standard: CardName).
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
      queryBuilder.andWhere("cn.docStatus = :status", {
        status: filters.DocStatus,
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

    // Executes the query with pagination logic (offset/limit) and results sorting.
    const result = await PageService.getPagedData<APCreditMemo>({
      dbName,
      entityName: "APCreditMemos",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    // Transform raw DB result to the unified API response format.
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
    throw caughtError;
  }
};

export const getCreditNoteDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, APCreditMemoSchema);
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

// Internal: Fetches A/P Credit Memo detail directly from SAP using DocEntry.
const getCreditNoteByDocEntry = async (sessionId: string, docEntry: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseCreditNotes(${docEntry})`,
    )) as SAPDocumentResponse;

    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
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
        return {
          ...normalizeSAPLineData(lineData),
          U_ReturnReason: lineData.U_ReturnReason,
        };
      }),
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      docEntry,
      error: caughtError.message,
      msg: "Failed to fetch A/P Credit Memo from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an A/P Credit Memo by DocNum from HANA to get its DocEntry, then fetches full details from SAP.
export const getCreditNoteByDocNum = async (sessionId: string, dbName: string, id: string) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new AppError("ID is required", 400, "VALIDATION_ERROR");
  }

  const repo = await getTenantRepository(dbName, APCreditMemoSchema);
  const match = await repo
    .createQueryBuilder("cn")
    .select(["cn.docEntry"])
    .where("CAST(cn.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  const docEntry = match?.docEntry ? String(match.docEntry) : normalizedId;
  return getCreditNoteByDocEntry(sessionId, docEntry);
};

// Obtains full document detail for an A/P Credit Memo from the SAP Service Layer.
// Note: Prefer using getCreditNoteByDocNum for DocNum-based lookups.
export const getCreditNote = async (sessionId: string, id: string) =>
  getCreditNoteByDocEntry(sessionId, id);

// Creates a formal A/P Credit Memo in SAP. Handles payload conversion.
export const createCreditNote = async (sessionId: string, payload: Record<string, unknown>) => {
  const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];

  try {
    // Construct the SAP Service Layer compatible payload.
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      Comments: payload.Comments,
      NumAtCard: payload.NumAtCard,
      DocDate: payload.DocDate,
      DocumentLines: lines.map((item) => {
        const line: Record<string, unknown> = {
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          VatGroup: item.VatGroup as string,
          WarehouseCode: item.WarehouseCode as string,
          DiscountPercent: Number(item.DiscountPercent ?? 0),
        };
        const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          line.UoMEntry = Math.trunc(uomEntry);
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            line.UoMCode = uomCode as string | number;
          }
        }
        if (item.U_ReturnReason) {
          line.U_ReturnReason = item.U_ReturnReason as string;
        }
        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          line.BaseType = item.BaseType as number;
          line.BaseEntry = item.BaseEntry as number;
          line.BaseLine = item.BaseLine as number;
        }
        return line;
      }),
      SalesPersonCode: payload.SalesPersonCode,
    };

    // Date normalization to ensure SAP acceptance (YYYY-MM-DD).
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }

    // Submit the credit note to SAP.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseCreditNotes",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge cached dashboard metrics as this new document impacts credit/balance totals.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "A/P Credit Memo created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/P Credit Memo in Service Layer",
    });
    throw caughtError;
  }
};

// Updates meta-fields (like Comments, NumAtCard, DocDueDate) on an existing A/P Credit Memo.
export const updateCreditNote = async (
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
    if (payload.DocDueDate) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/PurchaseCreditNotes(${id})`, sapPayload);

    // Clear relevant caches for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { message: "A/P Credit Memo updated successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/P Credit Memo",
    });
    throw caughtError;
  }
};

// Triggers the cancellation procedure for an A/P Credit Memo in SAP B1.
export const cancelCreditNote = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseCreditNotes(${id})/Cancel`);

    // Dashboard cache must be cleared to reflect the removal of this balance.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { message: "A/P Credit Memo cancelled successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/P Credit Memo",
    });
    throw caughtError;
  }
};

export const apCreditMemoService = {
  cancelCreditNote,
  createCreditNote,
  getCreditNote,
  getCreditNoteByDocNum,
  getCreditNoteDocNums,
  getCreditNotes,
  updateCreditNote,
};
