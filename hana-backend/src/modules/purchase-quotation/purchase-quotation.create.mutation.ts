// Purchase Quotation Service: Orchestrates vendor quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { assignDocumentBranch } from "@/modules/master-data/document-branch";
import { getDisplayCurrency, isUnresolvedCurrency } from "@/services/currency-format";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import { afterPqSaved } from "@/modules/intercompany";
import { attachSapLotCollections } from "@/services/sap-line-lots";
import { toSapCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
import type { IcHookResult } from "@/modules/intercompany";
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

    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

    let docCurrency = String(payload.DocCurrency || payload.DocCurr || "").trim();
    // Never send SAP local "$" — resolve via OADM, then env DEFAULT_CURRENCY_CODE.
    if (isUnresolvedCurrency(docCurrency)) {
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
      Comments: toSapCommentsField(payload.Comments),
      NumAtCard: payload.NumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      DocCurrency: docCurrency,
      RequriedDate:
        (payload as Record<string, unknown>).RequriedDate ?? payload.DocDueDate ?? payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((line) => {
        // PQ line split — write each field independently (no cross-copy):
        //   Quantity          → quoted qty (0 until vendor quotes; drives totals)
        //   RequiredQuantity  → required qty (PQT1.PQTReqQty)
        //   ReqDate           → required date
        //   ShipDate          → quoted date (omit when empty)
        const reqDate = normalizeSapDateValue(
          line.ReqDate ??
            line.RequiredDate ??
            line.requiredDate ??
            (payload as Record<string, unknown>).RequriedDate ??
            payload.DocDueDate ??
            payload.DocDate,
        );
        const shipDateRaw = line.ShipDate ?? line.QuotedDate ?? line.quotedDate;
        const shipDate = shipDateRaw ? normalizeSapDateValue(shipDateRaw) : "";
        const quotedQty = Number(line.Quantity ?? 0);
        // Prefer explicit RequiredQuantity (including 0). Only fall back when absent.
        const hasRequiredQty =
          line.RequiredQuantity !== undefined && line.RequiredQuantity !== null;
        const hasRequiredQtyAlt =
          line.requiredQuantity !== undefined && line.requiredQuantity !== null;
        const requiredQty = hasRequiredQty
          ? Number(line.RequiredQuantity)
          : hasRequiredQtyAlt
            ? Number(line.requiredQuantity)
            : 0;
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: Number.isFinite(quotedQty) ? quotedQty : 0,
          RequiredQuantity: Number.isFinite(requiredQty) ? requiredQty : 0,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          VatGroup: line.VatGroup as string,
          WarehouseCode: line.WarehouseCode as string,
        };
        if (reqDate) {
          docLine.ReqDate = reqDate;
        }
        if (shipDate) {
          docLine.ShipDate = shipDate;
        }
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

        attachSapLotCollections(docLine, line);
        return docLine;
      }),
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "540000006";
    }

    // Multi-branch (e.g. RCM): BPL from payload → line warehouse → default OBPL.
    await assignDocumentBranch({
      dbName: resolvedDbName,
      sapPayload,
      clientPayload: payload,
      logLabel: "PQ branch assignment",
    });

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

    if (resolvedDbName) {
      purgeCache(`dashboard:overview:${resolvedDbName}`);
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

    // Flow 1 IC: direct PQ only (not draft). Response does not wait for RFQ/SQ/notifications.
    let intercompany: IcHookResult | undefined;
    if (!isDraft && result.DocEntry) {
      try {
        intercompany = await afterPqSaved({
          address: payload.Address != null ? String(payload.Address) : null,
          address2: payload.Address2 != null ? String(payload.Address2) : null,
          cardCode: String(sapPayload.CardCode ?? payload.CardCode ?? ""),
          cardName: payload.CardName != null ? String(payload.CardName) : null,
          // Prefer SAP result Comments (parent typed), then request payload — never drop.
          comments:
            result.Comments != null && String(result.Comments).trim()
              ? String(result.Comments)
              : payload.Comments != null
                ? String(payload.Comments)
                : null,
          dbName: resolvedDbName,
          docDate: payload.DocDate,
          docDueDate: payload.DocDueDate,
          docEntry: Number(result.DocEntry),
          docNum: result.DocNum != null ? Number(result.DocNum) : null,
          lines: Array.isArray(lines) ? lines : [],
          numAtCard: payload.NumAtCard != null ? String(payload.NumAtCard) : null,
          requiredDate:
            (payload as Record<string, unknown>).RequriedDate ??
            payload.DocDueDate ??
            payload.DocDate,
          salesPersonCode: (() => {
            const raw =
              (payload as Record<string, unknown>).SalesPersonCode ??
              (payload as Record<string, unknown>).salesPersonCode;
            if (raw === null || raw === undefined || raw === "") {
              return null;
            }
            return typeof raw === "number" || typeof raw === "string" ? raw : String(raw);
          })(),
        });
      } catch (icErr: unknown) {
        logger.error({
          err: icErr instanceof Error ? icErr : new Error(String(icErr)),
          msg: "afterPqSaved threw unexpectedly; PQ remains created",
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
