// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository, executeTenantQuery } from "@/db/tenant-query";
// Data Access & Schemas
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { GRPOHeaderSchema } from "@/db/schemas/grpoheader.schema";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";
import { resolveCurrencyCode } from "@/services/currency-format";

import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Retrieves a paginated list of Purchase Orders from the HANA database.

export const getPurchaseOrder = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/PurchaseOrders(${id})`;
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
        "PurchaseOrder",
        result.DocEntry,
      );
    }

    // Normalizes SAP status (bost_Open) to a single character (O/C) for the internal logic.
    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Comments: result.Comments,
      DocCurr: resolveCurrencyCode(result.DocCurrency),
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      DocTotal: result.DocTotal,
      AttachmentEntry: attachmentEntry,
      attachments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        const normalized = normalizeSAPLineData(lineData);

        // Use TaxPercentagePerRow (the actual rate SAP applied) as the authoritative tax rate.
        // This is what SAP actually uses (e.g. 15 for "FJIN-15"), not our input TaxCode.
        const sapTaxRate = Number(
          lineData.TaxPercentagePerRow ?? lineData.TaxPrcnt ?? lineData.VatPrcnt ?? 0,
        );

        return {
          ...normalized,
          VatPrcnt: sapTaxRate,
          OpenQty: Number(
            lineData.OpenQuantity ??
              lineData.RemainingOpenQuantity ??
              lineData.RemainingQuantity ??
              lineData.BaseOpenQuantity ??
              line.Quantity ??
              0,
          ),
        };
      }),
      NumAtCard: result.NumAtCard,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch purchase order from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a PO by DocNum from tenant DB and fetches full details from Service Layer.

export const getPurchaseOrderByDocNum = async (
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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '22' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      const poDetail = await getPurchaseOrder(sessionId, String(draftMatch[0].DocEntry), true);
      return {
        ...poDetail,
        DocumentLines: (poDetail.DocumentLines || []).map((line) => ({
          ...line,
          OpenQty: line.Quantity,
        })),
      };
    }
  }

  // Resolves DocNum to DocEntry from HANA if necessary, ensuring Service Layer compatibility.
  const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
  const match = await repo
    .createQueryBuilder("po")
    .select(["po.docEntry"])
    .where("CAST(po.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  // If a match is found in HANA, we use the resolved DocEntry.
  // Otherwise, check ODRF to see if it is a draft.
  let poDocEntry = match?.docEntry ? String(match.docEntry) : null;
  let isDraft = false;

  if (!poDocEntry) {
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '22' AND CAST("DocNum" AS NVARCHAR) = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [normalizedId])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      poDocEntry = String(draftMatch[0].DocEntry);
      isDraft = true;
    }
  }

  if (!poDocEntry) {
    throw new AppError("Purchase Order not found", 404, "NOT_FOUND");
  }

  const poDetail = await getPurchaseOrder(sessionId, poDocEntry, isDraft);
  // Tax rates are already populated in getPurchaseOrder() from TaxPercentagePerRow.

  if (isDraft) {
    return {
      ...poDetail,
      DocumentLines: (poDetail.DocumentLines || []).map((line) => ({
        ...line,
        OpenQty: line.Quantity,
      })),
    };
  }

  // Calculate remaining open quantity per line by querying delivered quantities from PDN1 (GRPO lines).
  const pdn1Repo = await getTenantRepository(dbName, GRPOHeaderSchema);
  const deliveredLines = await pdn1Repo
    .createQueryBuilder("pdn1")
    .select("pdn1.baseLine", "baseLine")
    .addSelect("SUM(pdn1.quantity)", "deliveredQty")
    .where("pdn1.baseEntry = :baseEntry", { baseEntry: poDetail.DocEntry })
    .andWhere("pdn1.baseType = 22")
    .groupBy("pdn1.baseLine")
    .getRawMany<{ baseLine: number; deliveredQty: string }>();

  const deliveredByLine = new Map<number, number>();
  for (const row of deliveredLines) {
    deliveredByLine.set(Number(row.baseLine), Number(row.deliveredQty ?? 0));
  }

  // Enrich lines with calculated OpenQty.
  // Prefer the SAP-provided OpenQty (from Service Layer) as the authoritative source,
  // but use the PDN1-calculated value if it shows less remaining (i.e., more delivered).
  // This handles cases where PDN1 sync is faster or SAP's OpenQuantity hasn't been updated yet.
  const enrichedLines = (poDetail.DocumentLines || []).map((line: Record<string, unknown>) => {
    const lineNum = Number(line.LineNum ?? 0);
    const orderedQty = Number(line.Quantity ?? 0);
    const deliveredQty = deliveredByLine.get(lineNum) ?? 0;
    const pdn1OpenQty = Math.max(0, orderedQty - deliveredQty);

    // The line already has OpenQty from getPurchaseOrder() (SAP Service Layer fields).
    // Use the minimum of SAP's OpenQty and PDN1-calculated OpenQty as the safer value.
    const existingOpenQty = Number(line.OpenQty ?? orderedQty);
    const openQty = Math.min(existingOpenQty, pdn1OpenQty);

    return {
      ...line,
      OpenQty: openQty,
    };
  });

  return {
    ...poDetail,
    DocumentLines: enrichedLines,
  };
};

// Submits a new Purchase Order to SAP B1.
