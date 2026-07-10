// A/R Invoice Service: Logic for A/R Invoices (Sales), utilizing HANA for listings and SAP Service Layer for transaction management.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { executeTenantQuery, getTenantRepository } from "@/dal/tenant-dal.helper";
import type { InvoiceFilters } from "@/dal/types/ar-invoice.types";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "./attachments.service";

// Fetches a paginated list of A/R Invoices from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (OINV) with drafts (ODRF, ObjType='13').
export const getInvoices = async (dbName: string, filters: InvoiceFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '13'`);
      }

      if (filters.DocNum) {
        whereClauses.push(`CAST("DocNum" AS NVARCHAR) LIKE ?`);
        params.push(`%${filters.DocNum}%`);
      }

      if (filters.CardCode) {
        whereClauses.push(`"CardCode" LIKE ?`);
        params.push(`%${filters.CardCode}%`);
      }

      if (filters.CardName) {
        whereClauses.push(`LOWER("CardName") LIKE LOWER(?)`);
        params.push(`%${filters.CardName}%`);
      }

      if (filters.DocDateStart) {
        whereClauses.push(`"DocDate" >= ?`);
        params.push(filters.DocDateStart);
      }

      if (filters.DocDateEnd) {
        whereClauses.push(`"DocDate" <= ?`);
        params.push(filters.DocDateEnd);
      }

      if (filters.DocStatus) {
        const statusVal = filters.DocStatus;
        if (isDraft) {
          if (statusVal !== "D" && statusVal !== "Draft") {
            whereClauses.push("1=0");
          }
        } else {
          if (statusVal === "D" || statusVal === "Draft") {
            whereClauses.push("1=0");
          } else {
            whereClauses.push(`"DocStatus" = ?`);
            params.push(statusVal);
          }
        }
      }

      if (filters.NumAtCard) {
        whereClauses.push(`LOWER("NumAtCard") LIKE LOWER(?)`);
        params.push(`%${filters.NumAtCard}%`);
      }

      if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
        const opMap = { eq: "=", lt: "<", gt: ">" };
        const op = opMap[filters.DocTotalOperator as keyof typeof opMap];
        if (op) {
          whereClauses.push(`"DocTotal" ${op} ?`);
          params.push(filters.DocTotal);
        }
      }

      const selectColumns = isDraft
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", "NumAtCard", "Address", "Address2", 0 AS "PaidToDate"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "NumAtCard", "Address", "Address2", COALESCE("PaidToDate", 0) AS "PaidToDate"`;

      const sql = `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subInv = buildSubQuery("OINV", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subInv.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subInv.params, ...subDraft.params];

    const countSql = `SELECT COUNT(*) AS "total" FROM (${combinedSql}) AS "Counted"`;

    const sortFieldMap: Record<string, string> = {
      CardCode: `"CardCode"`,
      CardName: `"CardName"`,
      DocDate: `"DocDate"`,
      DocNum: `"DocNum"`,
      DocStatus: `"DocStatus"`,
      DocTotal: `"DocTotal"`,
      NumAtCard: `"NumAtCard"`,
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const orderBy = requestedSortField
      ? `ORDER BY ${requestedSortField} ${requestedSortOrder}`
      : `ORDER BY "DocDate" DESC, "DocNum" DESC`;

    const limit = Number(filters.limit) || 10;
    const page = Number(filters.page) || 1;
    const offset = (page - 1) * limit;

    const dataSql = `
      ${combinedSql}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...combinedParams, limit, offset];

    const [countRows, dataRows] = await Promise.all([
      executeTenantQuery(dbName, countSql, combinedParams) as Promise<any[]>,
      executeTenantQuery(dbName, dataSql, dataParams) as Promise<any[]>,
    ]);

    const total = Number(countRows[0]?.total ?? (countRows[0] as any)?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataRows.map((row: any) => ({
        id: row.DocEntry,
        DocNum: row.DocNum,
        DocDate: row.DocDate,
        CardCode: row.CardCode,
        CardName: row.CardName,
        DocTotal: row.DocTotal,
        BalanceDue: Math.round((Number(row.DocTotal) - Number(row.PaidToDate ?? 0)) * 100) / 100,
        DocCurr: row.DocCurr,
        NumAtCard: row.NumAtCard,
        DocStatus:
          row.DocStatus === "O"
            ? "Open"
            : row.DocStatus === "C"
              ? "Closed"
              : row.DocStatus === "D"
                ? "Draft"
                : row.DocStatus,
        Address: row.Address,
        Address2: row.Address2,
        paidToDate: Number(row.PaidToDate ?? 0),
      })),
      limit,
      page,
      total,
      totalPages,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      error: caughtError.message,
      msg: "Failed to fetch A/R Invoices",
    });
    throw caughtError;
  }
};

export const getInvoiceDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ARInvoiceSchema);
  const queryBuilder = repo.createQueryBuilder("inv");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("inv.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(inv.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("inv.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Retrieves detailed data for a single A/R Invoice from the SAP Service Layer.
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
    let attachments: import("./attachments.service").FileMetadata[] = [];
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
      error: caughtError.message,
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
      error: caughtError.message,
      msg: "Failed to resolve bin allocations",
    });
  }
};

// Creates a new Sales Invoice (A/R Invoice) in SAP B1.
export const createInvoice = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
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
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((line) => {
        const docLine: Record<string, unknown> = {
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
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
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      SalesPersonCode: payload.SalesPersonCode,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "13";
    }

    // Auto-allocate bin locations if dbName is provided and warehouse requires it
    const documentLines = (sapPayload.DocumentLines as Record<string, unknown>[]) ?? [];
    if (dbName && documentLines.length > 0) {
      await resolveBinAllocations(dbName, documentLines);
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

    logger.info({ msg: "DEBUG: SAP Invoice Payload", sapPayload });

    const endpoint = isDraft ? "/Drafts" : "/Invoices";
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      endpoint,
      sapPayload,
    )) as SAPDocumentResponse;

    if (!isDraft && draftDocEntry) {
      logger.info({ draftDocEntry, msg: "Deleting source draft after A/R Invoice conversion" });
      await serviceLayerClient
        .request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`)
        .catch((err) => {
          logger.error({
            draftDocEntry,
            error: err.message,
            msg: "Failed to delete draft after conversion",
          });
        });
    }

    // Purge sales-related dashboard cache to ensure totals are recalculated.
    if (resolvedDbName) {
      purgeCache(`dash:sales:${resolvedDbName}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "ARInvoice",
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
        ? "A/R Invoice Draft saved successfully"
        : "A/R Invoice created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/R Invoice in Service Layer",
    });
    throw caughtError;
  }
};

// Updates allowed mutable fields on an existing A/R Invoice.
export const updateInvoice = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  const isDraft = payload.isDraft === true || Boolean(payload.draftDocEntry);
  const docEntry = isDraft ? Number(payload.draftDocEntry || id) : id;

  try {
    const sapPayload: Record<string, unknown> = {};

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        // Fetch DocNum and existing AttachmentEntry directly from HANA database via TypeORM
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        if (!isDraft) {
          try {
            const invoiceRepo = await getTenantRepository(dbName, ARInvoiceSchema);
            const invoiceDoc = await invoiceRepo.findOne({
              where: { docEntry: Number(id) },
              select: ["docNum", "atcEntry"],
            });
            if (invoiceDoc) {
              docNum = invoiceDoc.docNum;
              existingAttachmentEntry = invoiceDoc.atcEntry ?? null;
            }
          } catch (dbErr: any) {
            logger.warn(
              { id, err: dbErr.message },
              "Failed to query database for doc info, falling back to Service Layer GET",
            );
            // Fallback to Service Layer GET if database query fails
            try {
              const docData = await serviceLayerClient.request<any>(
                sessionId,
                "GET",
                `/Invoices(${id})?$select=DocNum,AttachmentEntry`,
              );
              if (docData?.DocNum) {
                docNum = docData.DocNum;
              }
              if (docData?.AttachmentEntry) {
                existingAttachmentEntry = docData.AttachmentEntry;
              }
            } catch (err: any) {
              logger.warn({ id, err: err.message }, "Failed to fetch doc info from Service Layer");
            }
          }
        } else {
          try {
            const docData = await serviceLayerClient.request<any>(
              sessionId,
              "GET",
              `/Drafts(${docEntry})?$select=DocNum,AttachmentEntry`,
            );
            if (docData?.DocNum) {
              docNum = docData.DocNum;
            }
            if (docData?.AttachmentEntry) {
              existingAttachmentEntry = docData.AttachmentEntry;
            }
          } catch (err: any) {
            logger.warn(
              { id: docEntry, err: err.message },
              "Failed to fetch doc info from Service Layer",
            );
          }
        }

        const { attachmentEntry, shouldUpdateDoc } =
          await attachmentsService.syncAttachmentsOnUpdate(
            sessionId,
            dbName,
            isDraft ? "ARInvoiceDraft" : "ARInvoice",
            String(docEntry),
            docNum,
            payload.attachments as any[],
            existingAttachmentEntry,
          );

        if (shouldUpdateDoc) {
          sapPayload.AttachmentEntry = attachmentEntry;
        }
      }
    }

    if (Object.hasOwn(payload, "Comments")) {
      sapPayload.Comments = payload.Comments;
    }
    if (Object.hasOwn(payload, "Address")) {
      sapPayload.Address = payload.Address;
    }
    if (Object.hasOwn(payload, "Address2")) {
      sapPayload.Address2 = payload.Address2;
    }
    if (payload.DocDate !== undefined) {
      sapPayload.DocDate = payload.DocDate;
    }
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }
    const endpoint = isDraft ? `/Drafts(${docEntry})` : `/Invoices(${id})`;
    if (Object.hasOwn(payload, "NumAtCard")) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }

    // Recalculate discount if document lines are provided
    if (Array.isArray(payload.DocumentLines)) {
      const lines = payload.DocumentLines as Record<string, unknown>[];

      sapPayload.DocumentLines = lines.map((line) => {
        const docLine: Record<string, unknown> = {
          LineNum: line.LineNum !== undefined ? Number(line.LineNum) : undefined,
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
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
        return docLine;
      });
    }

    await serviceLayerClient.request(sessionId, "PATCH", endpoint, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Invalidate tenant-specific sales dashboard cache.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: isDraft
        ? "A/R Invoice Draft saved successfully"
        : "A/R Invoice updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/R Invoice",
    });
    throw caughtError;
  }
};

// Executes the cancellation procedure for an A/R Invoice in SAP B1.
export const cancelInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Invoices(${id})/Cancel`);

    // Dashboard caches Must be purged to reflect the loss of revenue/receivables.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "A/R Invoice canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/R Invoice",
    });
    throw caughtError;
  }
};

export const reopenInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Invoices(${id})/Reopen`);

    // Dashboard caches Must be purged to reflect the change.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "A/R Invoice reopened successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to reopen A/R Invoice",
    });
    throw caughtError;
  }
};

export const arInvoiceService = {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoiceByDocNum,
  getInvoiceDocNums,
  getInvoices,
  reopenInvoice,
  updateInvoice,
};
