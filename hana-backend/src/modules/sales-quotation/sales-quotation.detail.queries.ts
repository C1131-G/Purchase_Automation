// Sales Quotation Service: Orchestrates quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { SalesQuotationLineSchema } from "@/db/schemas/sales-quotation-line.schema";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "@/modules/attachments/attachments.service";

// Fetches a filtered and paginated list of Sales Quotations from the tenant-specific HANA database.
// Uses a UNION ALL pattern to combine final documents (OQUT) with drafts (ODRF, ObjType='23'),
// matching the Purchase Order reference implementation.

export const getSalesQuotation = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/Quotations(${id})`;
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
        "SalesQuotation",
        result.DocEntry,
      );
    }

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
      Address2: result.Address2,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      // normalizes SAP's internal string status.
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      Comments: result.Comments,
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard ?? "",
      AttachmentEntry: attachmentEntry,
      attachments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        return normalizeSAPLineData(lineData);
      }),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch sales quotation from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a Sales Quotation by DocNum from tenant DB and fetches full details from Service Layer.

export const getSalesQuotationByDocNum = async (
  sessionId: string,
  dbName: string,
  docNum: string,
  draftDocEntry?: string,
) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    throw new AppError("DocNum is required", 400, "VALIDATION_ERROR");
  }

  if (draftDocEntry) {
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '23' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getSalesQuotation(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  const repo = await getTenantRepository(dbName, SalesQuotationSchema);
  const match = await repo
    .createQueryBuilder("sq")
    .select(["sq.docEntry"])
    .where("CAST(sq.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (!match?.docEntry) {
    throw new AppError("Sales Quotation not found", 404, "NOT_FOUND");
  }

  return getSalesQuotation(sessionId, String(match.docEntry));
};

// Posts a new Sales Quotation to the Service Layer using the /Quotations endpoint.

export const getOpenSalesQuotationLines = async (dbName: string, cardCode: string) => {
  try {
    // Query HANA QUT1 (quotation lines) joined with OQUT (quotation header).
    // QUT1.OpenQty is the SAP-maintained remaining open quantity — it decrements automatically
    // as Sales Orders or AR Invoices are created against the quotation.
    const headerRepo = await getTenantRepository(dbName, SalesQuotationSchema);
    const rows = (await headerRepo
      .createQueryBuilder("h")
      .innerJoin(SalesQuotationLineSchema as any, "l", '"l"."DocEntry" = "h"."DocEntry"')
      .select([
        '"h"."DocEntry"   AS "DocEntry"',
        '"h"."DocNum"     AS "DocNum"',
        '"h"."DocDate"    AS "DocDate"',
        '"h"."DocCur"     AS "DocCurr"',
        '"h"."DiscPrcnt"  AS "HeaderDiscountPercent"',
        '"l"."LineNum"    AS "LineNum"',
        '"l"."ItemCode"   AS "ItemCode"',
        '"l"."Dscription" AS "ItemDescription"',
        '"l"."Quantity"   AS "Quantity"',
        '"l"."OpenQty"    AS "OpenQty"',
        '"l"."Price"      AS "Price"',
        '"l"."PriceBefDi" AS "PriceBefDi"',
        '"l"."VatGroup"   AS "VatGroup"',
        '"l"."VatPrcnt"   AS "VatPrcnt"',
        '"l"."WhsCode"    AS "WarehouseCode"',
        '"l"."UomCode"    AS "UoMCode"',
        '"l"."UomEntry"   AS "UoMEntry"',
        '"l"."DiscPrcnt"  AS "DiscountPercent"',
        '"l"."LineTotal"  AS "LineTotal"',
      ])
      .where('"h"."CardCode" = :cardCode', { cardCode })
      .andWhere('"h"."DocStatus" = :docStatus', { docStatus: "O" })
      .andWhere('"l"."OpenQty" > 0')
      .orderBy('"h"."DocNum"', "DESC")
      .addOrderBy('"l"."LineNum"', "ASC")
      .getRawMany()) as Record<string, unknown>[];

    const openLines = rows.map((row) => {
      const normalized = normalizeSAPLineData(row);
      const headerDiscountPercent = Number(row["HeaderDiscountPercent"] ?? 0);
      return {
        DiscountPercent: normalized.DiscountPercent || headerDiscountPercent,
        DocCurr: String(row["DocCurr"] ?? ""),
        DocDate: String(row["DocDate"] ?? ""),
        DocEntry: Number(row["DocEntry"]),
        DocNum: Number(row["DocNum"]),
        ItemCode: normalized.ItemCode,
        ItemDescription: normalized.ItemDescription,
        LineNum: normalized.LineNum,
        LineTotal: normalized.LineTotal,
        OpenQty: normalized.OpenQty,
        Price: normalized.Price,
        Quantity: normalized.Quantity,
        UoMCode: normalized.UoMCode,
        UoMEntry: normalized.UoMEntry,
        VatGroup: normalized.VatGroup,
        VatPrcnt: normalized.VatPrcnt,
        WarehouseCode: normalized.WarehouseCode,
      };
    });

    logger.info({ count: openLines.length, msg: "Open SQ lines from HANA" });

    return openLines;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      cardCode,
      err: caughtError,
      msg: "Failed to fetch open SQ lines from HANA",
    });
    throw caughtError;
  }
};
