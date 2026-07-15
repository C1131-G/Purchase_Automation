// Sales Order Service: Orchestrates order processing flows. Interfaces with HANA for high-volume order queries and Service Layer for document lifecycle management (Creation, Update, Cancellation).

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "@/modules/attachments/attachments.service";

// Fetches a filtered and paginated list of Sales Orders from the tenant-specific HANA database.
// Uses a UNION ALL pattern to combine final documents (ORDR) with drafts (ODRF, ObjType='17').

export const getSalesOrder = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/Orders(${id})`;
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
        "SalesOrder",
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
      DiscountPercent: result.DiscountPercent,
      DiscountAmount: result.TotalDiscount ?? 0,
      // normalizes SAP's internal string status.
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
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
      msg: "Failed to fetch sales order from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a Sales Order by DocNum from tenant DB and fetches full details from Service Layer.

export const getSalesOrderByDocNum = async (
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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '17' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getSalesOrder(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  const repo = await getTenantRepository(dbName, SalesOrderSchema);
  const match = await repo
    .createQueryBuilder("so")
    .select(["so.docEntry"])
    .where("CAST(so.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (!match?.docEntry) {
    throw new AppError("Sales Order not found", 404, "NOT_FOUND");
  }

  return getSalesOrder(sessionId, String(match.docEntry));
};

// Posts a new Sales Order to the Service Layer using the /Orders endpoint.

export const getSalesEmployees = async (dbName: string) => {
  const cacheKey = `master:${dbName}:SalesEmployees`;

  return getCachedData(
    cacheKey,
    async () => {
      try {
        const repository = await getTenantRepository(dbName, SalesEmployeeSchema);
        // Only active employees are returned to populate dropdowns correctly.
        const results = await repository.find({
          order: { SlpCode: "ASC" },
          select: ["SlpCode", "SlpName"],
          where: { Active: "Y" },
        });

        logger.info({
          count: results?.length,
          db: dbName,
          msg: "Sales Employees fetched (Fresh)",
        });

        return results.map((item) => ({
          code: item.SlpCode,
          id: item.SlpCode,
          name: item.SlpName,
        }));
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          db: dbName,
          err: caughtError,
          msg: "Failed to fetch sales employees from HANA",
        });
        const dbError = new Error(
          `Failed to retrieve sales employees: ${caughtError.message}`,
        ) as Error & {
          statusCode?: number;
        };
        dbError.statusCode = 500;

        throw dbError;
      }
    },
    1000 * 60 * 10, // 10-minute cache TTL as personnel lists are relatively static.
  );
};
