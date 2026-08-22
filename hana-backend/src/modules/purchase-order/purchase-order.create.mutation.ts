// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
// Data Access & Schemas
import { config } from "@/config/env";
import { resolveCurrencyCode } from "@/services/currency-format";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import {
  afterPoCreated,
  assertPqLinesCopyAllowed,
  commentsWithoutSapBaseAutoLines,
  recordIcPqToPoLink,
} from "@/modules/intercompany";
import { syncBuyerRemarksAfterCreate } from "@/modules/intercompany/infrastructure/service-layer/sync-buyer-remarks";
import type { IcHookResult } from "@/modules/intercompany";
import type { SAPDocumentResponse } from "@/services/types/sap.types";
import { assignDocumentBranch } from "@/modules/master-data/document-branch";
import { assignDocumentSeries, SAP_SERIES_OBJECT } from "@/modules/master-data/document-series";
import { toSapCreateCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
// Retrieves a paginated list of Purchase Orders from the HANA database.

export const createPurchaseOrder = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName: string | undefined,
  portalCreatedBy: string,
) => {
  try {
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

    if (!isDraft) {
      // Validate UoM before sending to SAP
      const inputLines = (payload.DocumentLines as Record<string, unknown>[]) || [];
      const linesMissingUom = inputLines
        .map((line) => ({
          itemCode: String(line.ItemCode ?? "").trim(),
          uomCode: String(line.UoMCode ?? line.UomCode ?? "").trim(),
          uomEntry: Number(line.UoMEntry ?? line.UomEntry),
        }))
        .filter((line) => !line.uomCode && !Number.isFinite(line.uomEntry));

      if (linesMissingUom.length > 0) {
        const missingItems = linesMissingUom.map((line) => line.itemCode || "<unknown>");
        logger.warn({
          missingItems,
          msg: "Purchase order payload has lines without UoMCode/UoMEntry",
        });
        throw new AppError(
          `Missing UoM for item(s): ${missingItems.join(", ")}`,
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

    const session = serviceLayerClient.getSession(sessionId);
    const resolvedDbName = session?.companyDB || dbName || "";
    if (resolvedDbName) {
      await assertPqLinesCopyAllowed(resolvedDbName, lines);
    }

    let absoluteEntry: number | null = null;
    if (attachments && attachments.length > 0 && resolvedDbName) {
      absoluteEntry = await attachmentsService.createSAPAttachment(
        sessionId,
        resolvedDbName,
        attachments,
      );
    }

    const documentLines = lines.map((item) => {
      const baseType = Number(item.BaseType);
      const baseEntry = Number(item.BaseEntry);
      const baseLine = Number(item.BaseLine);
      if (Number.isFinite(baseType) && Number.isFinite(baseEntry) && Number.isFinite(baseLine)) {
        // SAP resolves the item, price, tax, warehouse and UoM from the open RFQ line.
        // Re-sending those fields can make Service Layer reject an otherwise valid copy-from request.
        return {
          BaseEntry: baseEntry,
          BaseLine: baseLine,
          BaseType: baseType,
          Quantity: item.Quantity as number,
        };
      }

      const itemCode = String(item.ItemCode ?? "").trim();
      const itemDescription = String(
        item.ItemDescription ?? item.itemDescription ?? item.Dscription ?? item.ItemName ?? "",
      ).trim();
      const docLine: Record<string, unknown> = {
        LineNum: item.LineNum !== undefined ? Number(item.LineNum) : undefined,
        ItemCode: itemCode,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        DiscountPercent: Number(item.DiscountPercent ?? 0),
        UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
        VatGroup: item.VatGroup as string,
        WarehouseCode: item.WarehouseCode as string,
      };
      // Keep description in payload log + for partner-item setup (SL may ignore on PO lines).
      if (itemDescription) {
        docLine.ItemDescription = itemDescription;
      }
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

      return docLine;
    });

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: toSapCreateCommentsField(
        commentsWithoutSapBaseAutoLines(payload.Comments ?? draftComments, documentLines),
      ),
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: documentLines,
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
      U_CreatedBy: portalCreatedBy,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "22";
    }

    // Multi-branch (e.g. RCM): BPL from payload → line warehouse → default OBPL; omit when none (Ajax).
    const branchResolve = await assignDocumentBranch({
      dbName: resolvedDbName,
      sapPayload,
      clientPayload: payload,
      warehouseCode: String(lines[0]?.WarehouseCode ?? "").trim() || null,
      logLabel: "PO branch assignment",
    });
    await assignDocumentSeries({
      branchId: branchResolve.branchId,
      clientPayload: payload,
      dbName: resolvedDbName,
      logLabel: "PO series assignment",
      objectCode: SAP_SERIES_OBJECT.purchaseOrder,
      sapPayload,
    });

    // Formats DocDate into SAP-compliant YYYY-MM-DD.
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

    const sapEndpoint = isDraft ? "/Drafts" : "/PurchaseOrders";
    const sapUrl = `${config.serviceLayer.serviceLayerURL}${sapEndpoint}`;

    // Compact line snapshot for logs (omit null/empty — avoids noise when description/UoM absent).
    const poItemsForPartnerMaster = lines.map((line, index) => {
      const snap: Record<string, unknown> = {
        itemCode: String(line.ItemCode ?? "").trim(),
        lineNum: line.LineNum ?? index,
        quantity: line.Quantity,
        unitPrice: line.UnitPrice,
      };
      const itemDescription = String(line.ItemDescription ?? "").trim();
      if (itemDescription) {
        snap.itemDescription = itemDescription;
      }
      if (line.DiscountPercent != null && Number(line.DiscountPercent) !== 0) {
        snap.discountPercent = line.DiscountPercent;
      }
      if (line.UoMCode != null && String(line.UoMCode).trim()) {
        snap.uomCode = line.UoMCode;
      }
      if (line.UoMEntry != null && Number(line.UoMEntry) > 0) {
        snap.uomEntry = line.UoMEntry;
      }
      if (line.VatGroup != null && String(line.VatGroup).trim()) {
        snap.vatGroup = line.VatGroup;
      }
      if (line.WarehouseCode != null && String(line.WarehouseCode).trim()) {
        snap.warehouseCode = line.WarehouseCode;
      }
      return snap;
    });

    logger.info({
      cardCode: sapPayload.CardCode,
      companyDB: resolvedDbName,
      docDate: sapPayload.DocDate,
      docDueDate: sapPayload.DocDueDate,
      isDraft,
      lineCount: documentLines.length,
      msg: "Sending PO to SAP Service Layer",
      salesPersonCode: sapPayload.SalesPersonCode,
      url: sapUrl,
    });

    // Full SAP request body (use this to mirror items / fields in the partner DB).
    logger.info({
      companyDB: resolvedDbName,
      isDraft,
      msg: isDraft ? "PO draft SAP request payload" : "PO SAP request payload",
      sapEndpoint,
      sapPayload,
    });

    // Explicit item list for master-data setup in the second company.
    if (!isDraft) {
      logger.info({
        cardCode: sapPayload.CardCode,
        companyDB: resolvedDbName,
        items: poItemsForPartnerMaster,
        msg: "PO items for partner-company product master (create Item No. in target SAP DB if missing)",
      });
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseOrders",
      sapPayload,
    )) as SAPDocumentResponse;

    await syncBuyerRemarksAfterCreate({
      createdComments: result.Comments,
      docEntry: result.DocEntry,
      endpoint: isDraft ? "/Drafts" : "/PurchaseOrders",
      originalComments: sapPayload.Comments,
      sessionId,
    });

    logger.info({
      cardCode: result.CardCode,
      companyDB: resolvedDbName,
      docCurrency: result.DocCurrency,
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      docTotal: result.DocTotal,
      isDraft,
      msg: isDraft ? "PO draft created in SAP Service Layer" : "PO created in SAP Service Layer",
      url: sapUrl,
    });

    if (!isDraft) {
      logger.info({
        companyDB: resolvedDbName,
        docEntry: result.DocEntry,
        docNum: result.DocNum,
        items: poItemsForPartnerMaster,
        msg: "PO created — ensure these ItemCodes exist in partner SAP DB before IC AR invoice draft",
      });
    }

    // Invalidate the procurement dashboard metrics for this tenant.
    const resolvedDbNameFromRes = String(
      result.CompanyDB || result.DBName || session?.companyDB || resolvedDbName || "",
    );
    if (resolvedDbNameFromRes) {
      purgeCache(`dashboard:overview:${resolvedDbNameFromRes}`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbNameFromRes,
          "PurchaseOrder",
          result.DocEntry,
          result.DocNum,
          absoluteEntry,
          attachments,
        );
      }
    }

    // Flow 2 IC: schedule only — main PO create does not wait for AR invoice draft / notifications.
    let intercompany: IcHookResult | undefined;
    if (!isDraft && result.DocEntry) {
      try {
        await recordIcPqToPoLink({
          dbName: resolvedDbNameFromRes || resolvedDbName,
          lines,
          poDocEntry: Number(result.DocEntry),
          poDocNum: result.DocNum == null ? null : Number(result.DocNum),
        });
      } catch (linkError: unknown) {
        logger.error({
          err: linkError instanceof Error ? linkError : new Error(String(linkError)),
          msg: "PQ to PO IC linkage failed; Flow 2 will still be scheduled",
        });
      }

      try {
        // Preserve client-side item details for Flow 2; SAP receives only base references for copy-from lines.
        intercompany = await afterPoCreated({
          cardCode: String(sapPayload.CardCode ?? payload.CardCode ?? ""),
          currency: resolveCurrencyCode(result.DocCurrency) || undefined,
          dbName: resolvedDbNameFromRes || resolvedDbName,
          docDate: sapPayload.DocDate,
          docDueDate: sapPayload.DocDueDate,
          docEntry: Number(result.DocEntry),
          docNum: result.DocNum != null ? Number(result.DocNum) : null,
          isDraft: false,
          lines,
          numAtCard: sapPayload.NumAtCard,
          portalCreatedBy,
          remarks: sapPayload.Comments == null ? undefined : String(sapPayload.Comments),
        });
      } catch (icErr: unknown) {
        logger.error({
          err: icErr instanceof Error ? icErr : new Error(String(icErr)),
          msg: "afterPoCreated threw unexpectedly; PO remains created",
        });
        intercompany = {
          message: (icErr instanceof Error ? icErr.message : String(icErr)).slice(0, 2000),
          status: "failed",
        };
      }
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      intercompany,
      message: isDraft
        ? "Purchase Order Draft saved successfully"
        : "Purchase Order created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to create purchase order in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable fields (Comments, DueDate) on an existing PO.
