// A/R Credit Memo Service: Logic for A/R Credit Memos (Sales Returns/Credits), combining HANA queries for listings and SAP Service Layer for document lifecycle.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "@/modules/attachments/attachments.service";

// Fetches a paginated list of A/R Credit Memos from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (ORIN) with drafts (ODRF, ObjType='14').

export const createCreditNote = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Map input payload to the canonical SAP Service Layer JSON structure for Credit Notes.

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

    const session = serviceLayerClient.getSession(sessionId);
    const resolvedDbName = session?.companyDB || "";

    let absoluteEntry: number | null = null;
    if (attachments && attachments.length > 0 && resolvedDbName) {
      absoluteEntry = await attachmentsService.createSAPAttachment(
        sessionId,
        resolvedDbName,
        attachments,
      );
    }

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: payload.Comments ?? draftComments,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      AttachmentEntry: absoluteEntry ?? undefined,
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
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      SalesPersonCode: payload.SalesPersonCode,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "14";
    }

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
      msg: isDraft ? "Sending AR Credit Memo Draft to SAP" : "Sending AR Credit Memo to SAP",
    });

    const endpoint = isDraft ? "/Drafts" : "/CreditNotes";
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      endpoint,
      sapPayload,
    )) as SAPDocumentResponse;

    if (!isDraft && draftDocEntry) {
      logger.info({ draftDocEntry, msg: "Deleting source draft after A/R Credit Memo conversion" });
      await serviceLayerClient
        .request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`)
        .catch((err) => {
          logger.error({
            draftDocEntry,
            err: err,
            msg: "Failed to delete draft after conversion",
          });
        });
    }

    // Purge sales-related dashboard cache to ensure totals (including returns) are recalculated.
    if (resolvedDbName) {
      purgeCache(`dash:sales:${resolvedDbName}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "ARCreditMemo",
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
        ? "A/R Credit Memo Draft saved successfully"
        : "A/R Credit Memo created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to create A/R Credit Memo in Service Layer",
    });
    throw caughtError;
  }
};
