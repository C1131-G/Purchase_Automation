// A/P Credit Memo Service: Logic for A/P Credit Memos, combining HANA database queries for lists and SAP Service Layer for detailed document operations.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";
import { resolveCurrencyCode } from "@/services/currency-format";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService, type FileMetadata } from "@/modules/attachments/attachments.service";
import { pickSapSeries } from "@/modules/master-data/document-series";

// Fetches a paginated list of A/P Credit Memos from HANA.
// Uses TypeORM's query builder to construct dynamic filters based on user search criteria.

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
const getCreditNoteByDocEntry = async (sessionId: string, docEntry: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${docEntry})` : `/PurchaseCreditNotes(${docEntry})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let attachments: FileMetadata[] = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(sessionId, attachmentEntry, dbName);
    }
    if (attachments.length === 0 && dbName) {
      attachments = await attachmentsService.getLocalAttachments(
        dbName,
        "APCreditMemo",
        result.DocEntry,
      );
    }

    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Comments: result.Comments,
      DocCurr: resolveCurrencyCode(result.DocCurrency),
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocNum: result.DocNum,
      Series: pickSapSeries(result),
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      DocTotal: result.DocTotal,
      AttachmentEntry: attachmentEntry,
      attachments,
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
      err: caughtError,
      msg: "Failed to fetch A/P Credit Memo from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an A/P Credit Memo by DocNum from HANA to get its DocEntry, then fetches full details from SAP.

export const getCreditNoteByDocNum = async (
  sessionId: string,
  dbName: string,
  id: string,
  draftDocEntry?: string,
) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new AppError("ID is required", 400, "VALIDATION_ERROR");
  }

  if (draftDocEntry) {
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '19' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getCreditNoteByDocEntry(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  // 1. Check APCreditMemo (real document)
  const repo = await getTenantRepository(dbName, APCreditMemoSchema);
  const match = await repo
    .createQueryBuilder("cn")
    .select(["cn.docEntry"])
    .where("CAST(cn.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  if (match?.docEntry) {
    return getCreditNoteByDocEntry(sessionId, String(match.docEntry));
  }

  // 2. Check ODRF (draft document)
  const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '19' AND CAST("DocNum" AS NVARCHAR) = ?`;
  const draftMatch = (await executeTenantQuery(dbName, draftQuery, [normalizedId])) as any[];

  if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
    return getCreditNoteByDocEntry(sessionId, String(draftMatch[0].DocEntry), true);
  }

  throw new AppError("A/P Credit Memo not found", 404, "NOT_FOUND");
};

// Obtains full document detail for an A/P Credit Memo from the SAP Service Layer.
// Note: Prefer using getCreditNoteByDocNum for DocNum-based lookups.

export const getCreditNote = async (sessionId: string, id: string) =>
  getCreditNoteByDocEntry(sessionId, id);

// Creates a formal A/P Credit Memo in SAP. Handles payload conversion.
