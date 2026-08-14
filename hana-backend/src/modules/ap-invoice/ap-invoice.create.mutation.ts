import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { assignDocumentBranch } from "@/modules/master-data/document-branch";
import { assignDocumentSeries, SAP_SERIES_OBJECT } from "@/modules/master-data/document-series";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";
import { resolveBaseLineQuantities } from "@/services/base-qty-validation";
import { reconcilePOAfterCopyTo } from "@/services/po-reconcile";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import { toSapCreateCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
// Retrieves a paginated list of A/P Invoices from the tenant's HANA database.
// Uses raw UNION ALL queries to combine real documents and ODRF drafts.

export const createInvoice = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
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
    Comments: toSapCreateCommentsField(payload.Comments ?? draftComments),
    DocDate: payload.DocDate,
    DocDueDate: payload.DocDueDate || payload.DocDate,
    AttachmentEntry: absoluteEntry ?? undefined,
    DocumentLines: lines.map((item) => {
      const docLine: Record<string, unknown> = {
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
        docLine.UoMEntry = Math.trunc(uomEntry);
        docLine.UseBaseUnit = "tNO";
      } else {
        const uomCode = item.UoMCode ?? item.UomCode;
        if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
          docLine.UoMCode = uomCode as string | number;
          docLine.UseBaseUnit = "tNO";
        }
      }

      if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
        docLine.BaseType = item.BaseType;
        docLine.BaseEntry = item.BaseEntry;
        docLine.BaseLine = item.BaseLine;
      }

      return docLine;
    }),
    NumAtCard: payload.NumAtCard ?? draftNumAtCard,
    SalesPersonCode: payload.SalesPersonCode,
  };

  if (isDraft) {
    sapPayload.DocObjectCode = "18";
  }

  // Multi-branch (e.g. RCM): BPL from payload → line warehouse → default OBPL.
  const branchResolve = await assignDocumentBranch({
    dbName: resolvedDbName,
    sapPayload,
    clientPayload: payload,
    logLabel: "AP Invoice branch assignment",
  });
  await assignDocumentSeries({
    branchId: branchResolve.branchId,
    clientPayload: payload,
    dbName: resolvedDbName,
    logLabel: "AP Invoice series assignment",
    objectCode: SAP_SERIES_OBJECT.apInvoice,
    sapPayload,
  });

  // Resolve base document quantities for copy-to flows before submitting to SAP.
  // Lines exceeding their base open quantity will have their base linkage stripped
  // so SAP accepts them as unlinked override rows.
  const documentLines = (sapPayload.DocumentLines as Record<string, unknown>[]) ?? [];
  if (!isDraft && dbName && documentLines.length > 0) {
    await resolveBaseLineQuantities(sessionId, documentLines);
  }

  try {
    // Ensure DocDate is in ISO YYYY-MM-DD format as required by SAP Service Layer.
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

    // Create the purchase invoice document in SAP.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseInvoices",
      sapPayload,
    )) as SAPDocumentResponse;

    // Cache Invalidation: Clear dashboard stats for this tenant since a new invoice affects outstanding totals.
    if (resolvedDbName) {
      if (!isDraft) {
        purgeCache(`dashboard:overview:${resolvedDbName}`);
      }
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "APInvoice",
          result.DocEntry,
          result.DocNum,
          absoluteEntry,
          attachments,
        );
      }
    }

    // Reconcile originating PO(s) after A/P Invoice save.
    // Walks back to the PO from base linkage (direct or via GRPO) and closes it if fully consumed.
    if (!isDraft && dbName) {
      await reconcilePOAfterCopyTo(sessionId, dbName, documentLines);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: isDraft ? "A/P Invoice saved as draft" : "A/P Invoice created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    const errorMessage = caughtError.message || "";

    // SAP B1 enforces uniqueness on NumAtCard (Customer/Vendor Reference).
    // For copy-to flows (PO/GRPO -> AP Invoice), the same source reference may be reused.
    // Detect duplicate reference errors and retry with a unique suffix.
    const isDuplicateRefError =
      errorMessage.includes("duplicate") &&
      (errorMessage.toLowerCase().includes("reference") ||
        errorMessage.toLowerCase().includes("numatcard"));

    if (isDuplicateRefError && sapPayload.NumAtCard && !isDraft) {
      try {
        // Append a timestamp-based suffix to make the reference unique
        const originalRef = sapPayload.NumAtCard as string;
        const uniqueSuffix = Date.now().toString().slice(-6);
        sapPayload.NumAtCard = `${originalRef} (${uniqueSuffix})`;

        logger.info({
          msg: "Retrying AP Invoice create with unique reference due to duplicate NumAtCard",
          newRef: sapPayload.NumAtCard,
          originalRef,
        });

        const result = (await serviceLayerClient.request(
          sessionId,
          "POST",
          "/PurchaseInvoices",
          sapPayload,
        )) as SAPDocumentResponse;

        if (resolvedDbName) {
          purgeCache(`dashboard:overview:${resolvedDbName}`);
          if (result?.DocEntry && absoluteEntry !== null) {
            await attachmentsService.finalizeAndLinkAttachments(
              resolvedDbName,
              "APInvoice",
              result.DocEntry,
              result.DocNum,
              absoluteEntry,
              attachments,
            );
          }
        }

        // Reconcile originating PO(s) after A/P Invoice save (retry path).
        if (dbName) {
          await reconcilePOAfterCopyTo(sessionId, dbName, documentLines);
        }

        return {
          DocEntry: result.DocEntry,
          DocNum: result.DocNum,
          message: "A/P Invoice created successfully",
          success: true,
        };
      } catch (err: unknown) {
        const retryError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          err: retryError,
          msg: "Failed to create A/P Invoice even after retry with unique reference",
        });
        throw retryError;
      }
    }

    logger.error({
      err: caughtError,
      msg: "Failed to create A/P Invoice in Service Layer",
    });
    throw caughtError;
  }
};

// Updates an existing A/P Invoice. Currently, only the 'Comments' field is allowed for modification.
