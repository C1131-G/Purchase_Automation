// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
// Data Access & Schemas
import { config } from "@/config/env";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import { afterPoCreated } from "@/modules/intercompany";
import type { IcHookResult } from "@/modules/intercompany";
import type { SAPDocumentResponse } from "@/services/types/sap.types";
// Retrieves a paginated list of Purchase Orders from the HANA database.

export const createPurchaseOrder = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
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
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((item) => {
        const docLine: Record<string, unknown> = {
          LineNum: item.LineNum !== undefined ? Number(item.LineNum) : undefined,
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          DiscountPercent: Number(item.DiscountPercent ?? 0),
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          VatGroup: item.VatGroup as string,
          WarehouseCode: item.WarehouseCode as string,
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
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "22";
    }

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

    logger.info({
      msg: "Sending PO to SAP Service Layer",
      url: sapUrl,
      cardCode: sapPayload.CardCode,
      docDate: sapPayload.DocDate,
      docDueDate: sapPayload.DocDueDate,
      lineCount: (sapPayload.DocumentLines as any[])?.length ?? 0,
      salesPersonCode: sapPayload.SalesPersonCode,
      isDraft,
    });

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseOrders",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      msg: "PO created in SAP Service Layer",
      url: sapUrl,
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      cardCode: result.CardCode,
      docTotal: result.DocTotal,
      docCurrency: result.DocCurrency,
    });

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

    if (!isDraft && Number.isFinite(draftDocEntry) && draftDocEntry > 0) {
      try {
        await serviceLayerClient.request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`);
        logger.info({
          draftDocEntry,
          msg: "Deleted converted purchase order draft",
        });
      } catch (delErr: any) {
        logger.error({
          draftDocEntry,
          err: delErr,
          msg: "Failed to delete draft after conversion",
        });
      }
    }

    // Flow 2 IC automation: never fails the PO response.
    let intercompany: IcHookResult | undefined;
    if (!isDraft && result.DocEntry) {
      try {
        intercompany = await afterPoCreated({
          cardCode: String(sapPayload.CardCode ?? payload.CardCode ?? ""),
          currency: result.DocCurrency != null ? String(result.DocCurrency) : undefined,
          dbName: resolvedDbNameFromRes || resolvedDbName,
          docDate: sapPayload.DocDate,
          docDueDate: sapPayload.DocDueDate,
          docEntry: Number(result.DocEntry),
          docNum: result.DocNum != null ? Number(result.DocNum) : null,
          isDraft: false,
          lines: Array.isArray(lines) ? lines : [],
          numAtCard: sapPayload.NumAtCard,
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
