import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository, executeTenantQuery } from "@/db/tenant-query";
import { APCreditMemoHeaderSchema } from "@/db/schemas/apcreditmemoheader.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

import { attachmentsService, type FileMetadata } from "@/modules/attachments/attachments.service";

// Retrieves a paginated list of A/P Invoices from the tenant's HANA database.
// Uses raw UNION ALL queries to combine real documents and ODRF drafts.

export const getInvoice = async (
  sessionId: string,
  id: string,
  dbName?: string,
  isDraft = false,
) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/PurchaseInvoices(${id})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    // Calculate remaining open quantity per line by querying consumed quantities from RPC1 (AP Credit Memo lines).
    const consumedByLine = new Map<number, number>();
    if (dbName) {
      const rpc1Repo = await getTenantRepository(dbName, APCreditMemoHeaderSchema);
      const consumedLines = await rpc1Repo
        .createQueryBuilder("rpc1")
        .select("rpc1.baseLine", "baseLine")
        .addSelect("SUM(rpc1.quantity)", "consumedQty")
        .where("rpc1.baseEntry = :baseEntry", { baseEntry: result.DocEntry })
        .andWhere("rpc1.baseType = 18") // 18 = AP Invoice
        .groupBy("rpc1.baseLine")
        .getRawMany<{ baseLine: number; consumedQty: string }>();

      for (const row of consumedLines) {
        consumedByLine.set(Number(row.baseLine), Number(row.consumedQty ?? 0));
      }
    }

    // Enrich lines with calculated OpenQty.
    const enrichedLines = (result.DocumentLines || []).map((line: SAPDocumentLine) => {
      const lineData = line as unknown as Record<string, unknown>;
      const lineNum = Number(lineData.LineNum ?? 0);
      const orderedQty = Number(lineData.Quantity ?? 0);
      const consumedQty = consumedByLine.get(lineNum) ?? 0;
      const openQty = Math.max(0, orderedQty - consumedQty);

      const normalized = normalizeSAPLineData(lineData);
      return {
        ...normalized,
        OpenQty: openQty,
        OpenQuantity: openQty,
      };
    });

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbNameResolved = session?.companyDB || "";
    let attachments: FileMetadata[] = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(
        sessionId,
        attachmentEntry,
        dbNameResolved,
      );
    }
    if (attachments.length === 0 && dbNameResolved) {
      attachments = await attachmentsService.getLocalAttachments(
        dbNameResolved,
        "APInvoice",
        result.DocEntry,
      );
    }

    // Normalizing SAP's internal status representation (bost_Open -> 'O') for the frontend.
    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Comments: result.Comments,
      DocCurr: result.DocCurrency,
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
      DocumentLines: enrichedLines,
      NumAtCard: (() => {
        const ref = result.NumAtCard as string;
        if (ref && /\s\(\d{6}\)$/.test(ref)) {
          return ref.replace(/\s\(\d{6}\)$/, "");
        }
        return ref;
      })(),
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch A/P Invoice from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an A/P Invoice by its DocNum from the local HANA database to get its Service Layer DocEntry.

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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '18' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getInvoice(sessionId, String(draftMatch[0].DocEntry), dbName, true);
    }
  }

  // 1. Check OPCH (real document)
  const repo = await getTenantRepository(dbName, APInvoiceSchema);
  const match = await repo
    .createQueryBuilder("invoice")
    .select(["invoice.docEntry"])
    .where("CAST(invoice.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  if (match?.docEntry) {
    return getInvoice(sessionId, String(match.docEntry), dbName, false);
  }

  // 2. Check ODRF (draft document)
  const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '18' AND CAST("DocNum" AS NVARCHAR) = ?`;
  const draftMatch = (await executeTenantQuery(dbName, draftQuery, [normalizedId])) as any[];

  if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
    return getInvoice(sessionId, String(draftMatch[0].DocEntry), dbName, true);
  }

  throw new AppError("A/P Invoice not found", 404, "NOT_FOUND");
};

// Creates a new A/P Invoice in SAP B1. Handles data mapping and date formatting.

export const reopenInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseInvoices(${id})/Reopen`);
    return {
      message: "A/P Invoice reopened successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to reopen A/P Invoice",
    });
    throw caughtError;
  }
};
