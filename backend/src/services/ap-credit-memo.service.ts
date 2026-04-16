// A/P Credit Memo Service: Logic for A/P Credit Memos, combining HANA database queries for lists and SAP Service Layer for detailed document operations.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { CreditNoteFilters } from "@/dal/types/ap-credit-memo.types";
import { APCreditMemo, APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
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
        queryBuilder.andWhere("cn.docTotal = :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("cn.docTotal < :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("cn.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "cn.docNum",
      DocDate: "cn.docDate",
      CardCode: "cn.cardCode",
      CardName: "cn.cardName",
      DocTotal: "cn.docTotal",
      DocStatus: "cn.docStatus",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "cn.docDate": "DESC", "cn.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with pagination logic (offset/limit) and results sorting.
    const result = await PageService.getPagedData<APCreditMemo>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "APCreditMemos",
      dbName,
    });

    // Transform raw DB result to the unified API response format.
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
      id: result.DocEntry,
      DocNum: result.DocNum,
      DocDate: result.DocDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      Comments: result.Comments,
      DocDueDate: result.DocDueDate,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        const sapTaxRate = Number(lineData.TaxPercentagePerRow ?? lineData.VatPrcnt ?? 0);
        return {
          ItemCode: line.ItemCode,
          ItemDescription: line.ItemDescription,
          Quantity: line.Quantity,
          UoMCode: lineData.UoMCode,
          UoMEntry: lineData.UoMEntry,
          Price: line.Price,
          VatGroup: line.VatGroup || String(lineData.TaxCode ?? "").trim(),
          VatPrcnt: sapTaxRate,
          WarehouseCode: line.WarehouseCode,
          LineTotal: line.LineTotal,
        };
      }),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch A/P Credit Memo from Service Layer",
      error: error.message,
      docEntry,
    });
    throw error;
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
export const getCreditNote = async (sessionId: string, id: string) => {
  return getCreditNoteByDocEntry(sessionId, id);
};

// Creates a formal A/P Credit Memo in SAP. Handles payload conversion.
export const createCreditNote = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Construct the SAP Service Layer compatible payload.
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      Comments: payload.Comments,
      DocumentLines: (payload.DocumentLines as Record<string, unknown>[])?.map((item) => ({
        ItemCode: item.ItemCode as string,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        UoMCode: (item.UoMCode ?? item.UomCode) as string | number,
        UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
        VatGroup: item.VatGroup as string,
        WarehouseCode: item.WarehouseCode as string,
      })),
    };

    // Date normalization to ensure SAP acceptance (YYYY-MM-DD).
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
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
      success: true,
      message: "A/P Credit Memo created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to create A/P Credit Memo in Service Layer",
      error: error.message,
    });
    throw error;
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
    if (payload.Comments) sapPayload.Comments = payload.Comments;
    if (payload.NumAtCard) sapPayload.NumAtCard = payload.NumAtCard;
    if (payload.DocDueDate) sapPayload.DocDueDate = payload.DocDueDate;

    await serviceLayerClient.request(sessionId, "PATCH", `/PurchaseCreditNotes(${id})`, sapPayload);

    // Clear relevant caches for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { success: true, message: "A/P Credit Memo updated successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to update A/P Credit Memo", error: error.message, id });
    throw error;
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

    return { success: true, message: "A/P Credit Memo cancelled successfully" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Failed to cancel A/P Credit Memo", error: error.message, id });
    throw error;
  }
};

export const apCreditMemoService = {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNote,
  getCreditNoteByDocNum,
  createCreditNote,
  updateCreditNote,
  cancelCreditNote,
};
