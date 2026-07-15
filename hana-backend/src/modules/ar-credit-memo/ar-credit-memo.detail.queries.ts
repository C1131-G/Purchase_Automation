// A/R Credit Memo Service: Logic for A/R Credit Memos (Sales Returns/Credits), combining HANA queries for listings and SAP Service Layer for document lifecycle.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "@/modules/attachments/attachments.service";

// Fetches a paginated list of A/R Credit Memos from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (ORIN) with drafts (ODRF, ObjType='14').

export const getCreditNote = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/CreditNotes(${id})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let attachments: import("@/modules/attachments/attachments.service").FileMetadata[] = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(sessionId, attachmentEntry, dbName);
    }
    if (attachments.length === 0 && dbName) {
      attachments = await attachmentsService.getLocalAttachments(
        dbName,
        "ARCreditMemo",
        result.DocEntry,
      );
    }

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
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
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
      AttachmentEntry: attachmentEntry,
      attachments,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch A/R Credit Memo detail from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a DocNum to DocEntry from HANA and fetches full details from Service Layer.

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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '14' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getCreditNote(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  const repo = await getTenantRepository(dbName, ARCreditMemoSchema);
  const match = await repo
    .createQueryBuilder("cn")
    .select(["cn.docEntry"])
    .where("CAST(cn.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  const finalId = match?.docEntry ? String(match.docEntry) : normalizedId;
  return getCreditNote(sessionId, finalId);
};

// Creates a new Sales Credit Note (A/R Credit Memo) in SAP B1.
