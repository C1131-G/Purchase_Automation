// A/P Credit Memo Service: Logic for A/P Credit Memos, combining HANA database queries for lists and SAP Service Layer for detailed document operations.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { assignDocumentBranch } from "@/modules/master-data/document-branch";
import { assignDocumentSeries, SAP_SERIES_OBJECT } from "@/modules/master-data/document-series";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import { commentsWithoutSapBaseAutoLines } from "@/modules/intercompany";
import { syncBuyerRemarksAfterCreate } from "@/modules/intercompany/infrastructure/service-layer/sync-buyer-remarks";
import { toSapCreateCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
// Fetches a paginated list of A/P Credit Memos from HANA.
// Uses TypeORM's query builder to construct dynamic filters based on user search criteria.

export const createCreditNote = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName: string | undefined,
  portalCreatedBy: string,
) => {
  const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
  const attachments = payload.attachments as any[];
  const isDraft = payload.isDraft === true;
  const draftDocEntry = Number(payload.draftDocEntry || 0);

  // Defensive fallback: when converting a draft to a real document, re-read the draft from SAP
  // before deleting it so we can carry forward Comments/NumAtCard if the payload doesn't include them.
  let draftComments: string | undefined;
  let draftNumAtCard: string | undefined;
  if (!isDraft && draftDocEntry > 0) {
    try {
      const draftData = (await serviceLayerClient.request(
        sessionId,
        "GET",
        `/Drafts(${draftDocEntry})?$select=Comments,NumAtCard`,
      )) as { Comments?: string; NumAtCard?: string };
      draftComments = draftData?.Comments;
      draftNumAtCard = draftData?.NumAtCard;
    } catch {
      // Non-fatal: if we can't read the draft, proceed with the provided payload values.
    }
  }

  try {
    const session = serviceLayerClient.getSession(sessionId);
    const resolvedDbName = session?.companyDB || dbName || "";

    let absoluteEntry: number | null = null;
    if (attachments && attachments.length > 0 && resolvedDbName) {
      absoluteEntry = await attachmentsService.createSAPAttachment(
        sessionId,
        resolvedDbName,
        attachments,
      );
    }

    // Construct the SAP Service Layer compatible payload.
    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: toSapCreateCommentsField(
        commentsWithoutSapBaseAutoLines(payload.Comments ?? draftComments, lines),
      ),
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
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
          line.UseBaseUnit = "tNO";
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            line.UoMCode = uomCode as string | number;
            line.UseBaseUnit = "tNO";
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
      U_CreatedBy: portalCreatedBy,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "19";
    }

    // Multi-branch (e.g. RCM): BPL from payload → line warehouse → default OBPL.
    const branchResolve = await assignDocumentBranch({
      dbName: resolvedDbName,
      sapPayload,
      clientPayload: payload,
      logLabel: "AP Credit Memo branch assignment",
    });
    await assignDocumentSeries({
      branchId: branchResolve.branchId,
      clientPayload: payload,
      dbName: resolvedDbName,
      logLabel: "AP Credit Memo series assignment",
      objectCode: SAP_SERIES_OBJECT.apCreditMemo,
      sapPayload,
    });

    // Date normalization to ensure SAP acceptance (YYYY-MM-DD).
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.slice(0, 4)}-${docDueDate.slice(4, 6)}-${docDueDate.slice(6, 8)}`;
    }
    // Submit the credit note to SAP.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseCreditNotes",
      sapPayload,
    )) as SAPDocumentResponse;

    await syncBuyerRemarksAfterCreate({
      createdComments: result.Comments,
      docEntry: result.DocEntry,
      endpoint: isDraft ? "/Drafts" : "/PurchaseCreditNotes",
      originalComments: sapPayload.Comments,
      sessionId,
    });

    // Purge cached dashboard metrics as this new document impacts credit/balance totals.
    if (resolvedDbName) {
      if (!isDraft) {
        purgeCache(`dashboard:overview:${resolvedDbName}`);
      }
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "APCreditMemo",
          result.DocEntry,
          result.DocNum,
          absoluteEntry,
          attachments,
        );
      }
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: isDraft
        ? "A/P Credit Memo Draft saved successfully"
        : "A/P Credit Memo created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to create A/P Credit Memo in Service Layer",
    });
    throw caughtError;
  }
};

// Updates meta-fields (like Comments, NumAtCard, DocDueDate) on an existing A/P Credit Memo.
