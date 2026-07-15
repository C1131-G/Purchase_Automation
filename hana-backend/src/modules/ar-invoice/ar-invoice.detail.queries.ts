// A/R Invoice Service: Logic for A/R Invoices (Sales), utilizing HANA for listings and SAP Service Layer for transaction management.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "@/modules/attachments/attachments.service";

// Fetches a paginated list of A/R Invoices from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (OINV) with drafts (ODRF, ObjType='13').

export const getInvoice = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/Invoices(${id})`;
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
        "ARInvoice",
        result.DocEntry,
      );
    }

    // Normalize SAP internal status (bost_Open) to a single character code.
    return {
      id: result.DocEntry,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Address: result.Address,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: result.TotalDiscount ?? 0,
      // normalizes SAP's internal string status.
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
      Comments: result.Comments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        return normalizeSAPLineData(lineData);
      }),
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard || "",
      Address2: (result as unknown as Record<string, unknown>).Address2 || "",
      AttachmentEntry: attachmentEntry,
      attachments,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch A/R Invoice from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a DocNum to DocEntry from HANA and fetches full details from Service Layer.

export const getInvoiceByDocNum = async (
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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '13' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getInvoice(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  const repo = await getTenantRepository(dbName, ARInvoiceSchema);
  const match = await repo
    .createQueryBuilder("inv")
    .select(["inv.docEntry"])
    .where("CAST(inv.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  const finalId = match?.docEntry ? String(match.docEntry) : normalizedId;
  return getInvoice(sessionId, finalId);
};

// Helper: Resolves and appends greedy bin allocations to document lines if a warehouse has bin locations enabled.

export const resolveBinAllocations = async (
  dbName: string,
  documentLines: Record<string, unknown>[],
) => {
  try {
    for (let i = 0; i < documentLines.length; i++) {
      const line = documentLines[i];
      const warehouseCode = line.WarehouseCode as string;
      const itemCode = line.ItemCode as string;
      const quantity = Number(line.Quantity ?? 0);

      if (!warehouseCode || !itemCode || quantity <= 0) continue;

      // Check if warehouse has Bin Locations enabled
      const whsRows = (await executeTenantQuery(
        dbName,
        `SELECT "BinActivat" FROM "OWHS" WHERE "WhsCode" = ?`,
        [warehouseCode],
      )) as { BinActivat: string }[];

      if (!whsRows || whsRows.length === 0 || whsRows[0].BinActivat !== "Y") {
        continue;
      }

      // Warehouse has bins enabled. Fetch bin stock for this item ordered by OnHandQty (descending)
      const binStock = (await executeTenantQuery(
        dbName,
        `SELECT q."BinAbs", q."OnHandQty"
         FROM "OIBQ" q
         INNER JOIN "OBIN" b ON b."AbsEntry" = q."BinAbs"
         WHERE q."ItemCode" = ? AND q."WhsCode" = ? AND q."OnHandQty" > 0
         ORDER BY q."OnHandQty" DESC`,
        [itemCode, warehouseCode],
      )) as { BinAbs: number; OnHandQty: string }[];

      if (!binStock || binStock.length === 0) {
        continue; // No stock in bins; skip and let SAP raise standard stock errors if applicable
      }

      // Allocate stock greedily
      let remainingQty = quantity;
      const allocations: Record<string, unknown>[] = [];

      for (const bin of binStock) {
        if (remainingQty <= 0) break;
        const binQty = Number(bin.OnHandQty);
        const allocated = Math.min(remainingQty, binQty);

        allocations.push({
          BaseLineNumber: i,
          BinAbsEntry: bin.BinAbs,
          Quantity: allocated,
        });

        remainingQty -= allocated;
      }

      if (allocations.length > 0) {
        line.DocumentLinesBinAllocations = allocations;
        logger.info({
          allocationsCount: allocations.length,
          itemCode,
          msg: "Automatically resolved bin allocations for document line",
          warehouseCode,
        });
      }
    }
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to resolve bin allocations",
    });
  }
};

// Creates a new Sales Invoice (A/R Invoice) in SAP B1.
