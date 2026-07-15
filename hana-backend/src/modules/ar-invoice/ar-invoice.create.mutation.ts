// A/R Invoice Service: Logic for A/R Invoices (Sales), utilizing HANA for listings and SAP Service Layer for transaction management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "@/modules/attachments/attachments.service";

// Fetches a paginated list of A/R Invoices from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (OINV) with drafts (ODRF, ObjType='13').

import { resolveBinAllocations } from "./ar-invoice.queries";

export const createInvoice = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
  try {
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
    const resolvedDbName = session?.companyDB || dbName || "";

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
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      SalesPersonCode: payload.SalesPersonCode,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "13";
    }

    // Auto-allocate bin locations if dbName is provided and warehouse requires it
    const documentLines = (sapPayload.DocumentLines as Record<string, unknown>[]) ?? [];
    if (dbName && documentLines.length > 0) {
      await resolveBinAllocations(dbName, documentLines);
    }

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

    const endpoint = isDraft ? "/Drafts" : "/Invoices";
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      endpoint,
      sapPayload,
    )) as SAPDocumentResponse;

    if (!isDraft && draftDocEntry) {
      logger.info({ draftDocEntry, msg: "Deleting source draft after A/R Invoice conversion" });
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

    // Purge sales-related dashboard cache to ensure totals are recalculated.
    if (resolvedDbName) {
      purgeCache(`dash:sales:${resolvedDbName}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "ARInvoice",
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
        ? "A/R Invoice Draft saved successfully"
        : "A/R Invoice created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to create A/R Invoice in Service Layer",
    });
    throw caughtError;
  }
};

// Updates allowed mutable fields on an existing A/R Invoice.
