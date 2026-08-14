// Sales Quotation Service: Orchestrates quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import {
  resolveDocumentSeries,
  resolveItemSalesUom,
} from "@/modules/master-data/master-data.service";
import { assignDocumentBranch } from "@/modules/master-data/document-branch";
import { toSapCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a filtered and paginated list of Sales Quotations from the tenant-specific HANA database.
// Uses a UNION ALL pattern to combine final documents (OQUT) with drafts (ODRF, ObjType='23'),
// matching the Purchase Order reference implementation.

export const createSalesQuotation = async (sessionId: string, payload: Record<string, unknown>) => {
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
      Comments: toSapCommentsField(payload.Comments ?? draftComments),
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: await Promise.all(
        lines.map(async (line) => {
          const itemCode = String(line.ItemCode ?? "").trim();
          const docLine: Record<string, unknown> = {
            ItemCode: itemCode,
            Quantity: line.Quantity as number,
            UnitPrice: (line.UnitPrice || line.Price) as number,
            DiscountPercent: Number(line.DiscountPercent ?? 0),
            VatGroup: line.VatGroup as string,
            WarehouseCode: line.WarehouseCode as string,
          };

          // Prefer client UoMEntry; else resolve mother/sales UoM from OITM (do not invent from WH).
          const uomEntry = Number(line.UoMEntry ?? line.UomEntry);
          if (Number.isFinite(uomEntry) && uomEntry > 0) {
            docLine.UoMEntry = Math.trunc(uomEntry);
            docLine.UseBaseUnit = "tNO";
          } else {
            const uomCodeRaw = line.UoMCode ?? line.UomCode;
            const uomCode =
              typeof uomCodeRaw === "number" ||
              (typeof uomCodeRaw === "string" && uomCodeRaw.trim())
                ? String(uomCodeRaw).trim()
                : "";
            if (uomCode) {
              docLine.UoMCode = uomCode;
              docLine.UseBaseUnit = "tNO";
            } else if (itemCode && resolvedDbName) {
              const mother = await resolveItemSalesUom(resolvedDbName, itemCode);
              if (mother?.uomEntry != null) {
                docLine.UoMEntry = mother.uomEntry;
                docLine.UseBaseUnit = "tNO";
              } else if (mother?.uomCode) {
                docLine.UoMCode = mother.uomCode;
                docLine.UseBaseUnit = "tNO";
              }
            }
          }

          if (Number.isFinite(line.BaseEntry) && Number.isFinite(line.BaseLine)) {
            docLine.BaseType = line.BaseType;
            docLine.BaseEntry = line.BaseEntry;
            docLine.BaseLine = line.BaseLine;
          }

          return docLine;
        }),
      ),
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "23";
    }

    // Multi-branch: payload → warehouse BPLid → default OBPL. Align series to branch.
    const documentLines = sapPayload.DocumentLines as Record<string, unknown>[];
    const firstWh = String(documentLines[0]?.WarehouseCode ?? "").trim() || null;
    const branchResolve = await assignDocumentBranch({
      dbName: resolvedDbName,
      sapPayload,
      clientPayload: payload,
      warehouseCode: firstWh,
      logLabel: "Sales quotation branch assignment",
    });

    // Number series: align DocNum with SAP NNM1.NextNumber for this object + branch.
    const seriesResolve = await resolveDocumentSeries(resolvedDbName, "23", {
      branchId: branchResolve.branchId,
      payloadSeries: payload.Series ?? payload.series,
    });
    if (seriesResolve) {
      sapPayload.Series = seriesResolve.series;
    }

    logger.info({
      branchId: branchResolve.branchId,
      companyDB: resolvedDbName,
      msg: "Sales quotation series assignment",
      series: seriesResolve?.series ?? null,
      seriesNextNumber: seriesResolve?.nextNumber ?? null,
      seriesSource: seriesResolve?.source ?? null,
      warehouseCode: firstWh,
    });

    // Standardize date into ISO format (YYYY-MM-DD) for Service Layer ingestion.
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

    const endpoint = isDraft ? "/Drafts" : "/Quotations";
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      endpoint,
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      msg: isDraft ? "Sales quotation draft created in SAP" : "Sales quotation created in SAP",
    });

    // Invalidate the sales dashboard cache as revenue and quotation counts have changed.
    if (resolvedDbName) {
      purgeCache(`dashboard:overview:${resolvedDbName}`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "SalesQuotation",
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
        ? "Sales Quotation draft saved successfully"
        : "Sales Quotation created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to create sales quotation in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable document fields (Comments, Address, Lines).
