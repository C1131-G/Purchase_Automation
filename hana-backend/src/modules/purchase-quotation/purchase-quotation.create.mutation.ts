// Purchase Quotation Service: Orchestrates vendor quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getDisplayCurrency } from "@/services/currency-format";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";
const normalizeSapDateValue = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw.slice(0, 10);
};

// Fetches a filtered and paginated list of Purchase Quotations from the tenant-specific HANA database.

export const createPurchaseQuotation = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
  try {
    const isDraft = payload.isDraft === true;
    const draftDocEntry = Number(payload.draftDocEntry || 0);

    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

    let docCurrency = String(payload.DocCurrency || payload.DocCurr || "").trim();
    if (!docCurrency || docCurrency === "$") {
      docCurrency = await getDisplayCurrency(dbName || "");
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
      Comments: payload.Comments,
      NumAtCard: payload.NumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      DocCurrency: docCurrency,
      RequriedDate:
        (payload as Record<string, unknown>).RequriedDate ?? payload.DocDueDate ?? payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((line) => {
        // PQT1.Quantity drives LineTotal / DocTotal computation in SAP.
        // PQT1.PQTReqQty carries the user-entered required quantity semantic
        // requested by the vendor portal flow.
        // PQT1.ShipDate mirrors PQT1.ReqDate so the quoted shipping date
        // matches the user-entered required date in the vendor portal flow.
        const reqDate = normalizeSapDateValue(
          line.ReqDate ??
            line.RequiredDate ??
            line.requiredDate ??
            payload.DocDueDate ??
            payload.DocDate,
        );
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: Number(line.Quantity ?? 0),
          RequiredQuantity: Number(line.Quantity ?? 0),
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
          ReqDate: reqDate,
          ShipDate: reqDate,
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
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "540000006";
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
    const requiredDate = sapPayload.RequriedDate as string;
    if (requiredDate && requiredDate.length === 8) {
      sapPayload.RequriedDate = `${requiredDate.slice(0, 4)}-${requiredDate.slice(
        4,
        6,
      )}-${requiredDate.slice(6, 8)}`;
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseQuotations",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      msg: isDraft
        ? "Purchase quotation draft created in SAP"
        : "Purchase quotation created in SAP",
    });

    if (!isDraft && Number.isFinite(draftDocEntry) && draftDocEntry > 0) {
      try {
        await serviceLayerClient.request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`);
        logger.info({
          draftDocEntry,
          msg: "Deleted converted purchase quotation draft",
        });
      } catch (delErr: any) {
        logger.error({
          draftDocEntry,
          err: delErr,
          msg: "Failed to delete draft after conversion",
        });
      }
    }

    if (resolvedDbName) {
      purgeCache(`dash:purchase:${resolvedDbName}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "PurchaseQuotation",
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
        ? "Purchase Quotation Draft saved successfully"
        : "Purchase Quotation created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to create purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable document fields (Comments, Address, Lines).
