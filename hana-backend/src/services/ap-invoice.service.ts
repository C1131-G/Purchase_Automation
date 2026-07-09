import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository, executeTenantQuery } from "@/dal/tenant-dal.helper";
import type { InvoiceFilters } from "@/dal/types/ap-invoice.types";
import { APCreditMemoHeaderSchema } from "@/db/schemas/apcreditmemoheader.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

import { resolveBaseLineQuantities } from "./base-qty-validation.util";
import { reconcilePOAfterCopyTo } from "./po-reconcile.util";
import { attachmentsService, type FileMetadata } from "./attachments.service";

// Retrieves a paginated list of A/P Invoices from the tenant's HANA database.
// Uses raw UNION ALL queries to combine real documents and ODRF drafts.
export const getInvoices = async (dbName: string, filters: InvoiceFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '18'`);
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

      if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
        const opMap = { eq: "=", lt: "<", gt: ">" } as const;
        const op = opMap[filters.DocTotalOperator as keyof typeof opMap];
        if (op) {
          whereClauses.push(`"DocTotal" ${op} ?`);
          params.push(filters.DocTotal);
        }
      }

      const selectColumns = isDraft
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus"`;

      const sql = `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subMain = buildSubQuery("OPCH", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subMain.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subMain.params, ...subDraft.params];

    const countSql = `SELECT COUNT(*) AS "total" FROM (${combinedSql}) AS "Counted"`;

    const sortFieldMap: Record<string, string> = {
      CardCode: `"CardCode"`,
      CardName: `"CardName"`,
      DocDate: `"DocDate"`,
      DocNum: `"DocNum"`,
      DocStatus: `"DocStatus"`,
      DocTotal: `"DocTotal"`,
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
        CardCode: row.CardCode,
        CardName: row.CardName,
        DocCurr: row.DocCurr,
        DocDate: row.DocDate,
        DocNum: row.DocNum,
        DocStatus: row.DocStatus === "O" ? "Open" : row.DocStatus === "C" ? "Closed" : "Draft",
        DocTotal: row.DocTotal,
        id: row.DocEntry,
      })),
      limit,
      page,
      total,
      totalPages,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

export const getInvoiceDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, APInvoiceSchema);
  const queryBuilder = repo.createQueryBuilder("invoice");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("invoice.docNum", "DocNum")
    .addSelect("invoice.cardCode", "CardCode")
    .addSelect("invoice.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(invoice.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("invoice.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    DocNum: number | string;
    CardCode?: string;
    CardName?: string;
  }>();
  return rows
    .map((row) => ({
      code: String(row.DocNum).trim(),
      name: row.CardCode
        ? `[${row.CardCode}] ${row.CardName || ""}`.trim()
        : String(row.DocNum).trim(),
    }))
    .filter((item) => item.code.length > 0);
};

// Fetches full document details for a specific A/P Invoice directly from the SAP Service Layer.
// This includes line items which are typically not loaded in the list view.
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
      error: caughtError.message,
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
export const createInvoice = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
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
    DocDueDate: payload.DocDueDate || payload.DocDate,
    AttachmentEntry: absoluteEntry ?? undefined,
    DocumentLines: lines.map((item) => {
      const docLine: Record<string, unknown> = {
        ItemCode: item.ItemCode as string,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
        VatGroup: item.VatGroup as string,
        WarehouseCode: item.WarehouseCode as string,
        DiscountPercent: Number(item.DiscountPercent ?? 0),
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
    NumAtCard: payload.NumAtCard ?? draftNumAtCard,
    SalesPersonCode: payload.SalesPersonCode,
  };

  if (isDraft) {
    sapPayload.DocObjectCode = "18";
  }

  // Resolve base document quantities for copy-to flows before submitting to SAP.
  // Lines exceeding their base open quantity will have their base linkage stripped
  // so SAP accepts them as unlinked override rows.
  const documentLines = (sapPayload.DocumentLines as Record<string, unknown>[]) ?? [];
  if (!isDraft && dbName && documentLines.length > 0) {
    await resolveBaseLineQuantities(sessionId, documentLines);
  }

  try {
    // Ensure DocDate is in ISO YYYY-MM-DD format as required by SAP Service Layer.
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

    // Create the purchase invoice document in SAP.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseInvoices",
      sapPayload,
    )) as SAPDocumentResponse;

    // After converting a draft to a real document, delete the draft.
    if (!isDraft && draftDocEntry) {
      try {
        await serviceLayerClient.request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`);
        logger.info({ draftDocEntry, msg: "Deleted draft after successful AP Invoice creation" });
      } catch (draftErr: unknown) {
        const draftDelErr = draftErr instanceof Error ? draftErr : new Error(String(draftErr));
        logger.warn({
          draftDocEntry,
          error: draftDelErr.message,
          msg: "Failed to delete draft after AP Invoice creation (non-fatal)",
        });
      }
    }

    // Cache Invalidation: Clear dashboard stats for this tenant since a new invoice affects outstanding totals.
    if (resolvedDbName) {
      if (!isDraft) {
        purgeCache(`dash:purchase:${resolvedDbName}:`);
      }
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "APInvoice",
          result.DocEntry,
          result.DocNum,
          absoluteEntry,
          attachments,
        );
      }
    }

    // Reconcile originating PO(s) after A/P Invoice save.
    // Walks back to the PO from base linkage (direct or via GRPO) and closes it if fully consumed.
    if (!isDraft && dbName) {
      await reconcilePOAfterCopyTo(sessionId, dbName, documentLines);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: isDraft ? "A/P Invoice saved as draft" : "A/P Invoice created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    const errorMessage = caughtError.message || "";

    // SAP B1 enforces uniqueness on NumAtCard (Customer/Vendor Reference).
    // For copy-to flows (PO/GRPO -> AP Invoice), the same source reference may be reused.
    // Detect duplicate reference errors and retry with a unique suffix.
    const isDuplicateRefError =
      errorMessage.includes("duplicate") &&
      (errorMessage.toLowerCase().includes("reference") ||
        errorMessage.toLowerCase().includes("numatcard"));

    if (isDuplicateRefError && sapPayload.NumAtCard && !isDraft) {
      try {
        // Append a timestamp-based suffix to make the reference unique
        const originalRef = sapPayload.NumAtCard as string;
        const uniqueSuffix = Date.now().toString().slice(-6);
        sapPayload.NumAtCard = `${originalRef} (${uniqueSuffix})`;

        logger.info({
          msg: "Retrying AP Invoice create with unique reference due to duplicate NumAtCard",
          newRef: sapPayload.NumAtCard,
          originalRef,
        });

        const result = (await serviceLayerClient.request(
          sessionId,
          "POST",
          "/PurchaseInvoices",
          sapPayload,
        )) as SAPDocumentResponse;

        if (resolvedDbName) {
          purgeCache(`dash:purchase:${resolvedDbName}:`);
          if (result?.DocEntry && absoluteEntry !== null) {
            await attachmentsService.finalizeAndLinkAttachments(
              resolvedDbName,
              "APInvoice",
              result.DocEntry,
              result.DocNum,
              absoluteEntry,
              attachments,
            );
          }
        }

        // Reconcile originating PO(s) after A/P Invoice save (retry path).
        if (dbName) {
          await reconcilePOAfterCopyTo(sessionId, dbName, documentLines);
        }

        return {
          DocEntry: result.DocEntry,
          DocNum: result.DocNum,
          message: "A/P Invoice created successfully",
          success: true,
        };
      } catch (err: unknown) {
        const retryError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          error: retryError.message,
          msg: "Failed to create A/P Invoice even after retry with unique reference",
        });
        throw retryError;
      }
    }

    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/P Invoice in Service Layer",
    });
    throw caughtError;
  }
};

// Updates an existing A/P Invoice. Currently, only the 'Comments' field is allowed for modification.
export const updateInvoice = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  const isDraft = payload.isDraft === true;

  try {
    const sapPayload: Record<string, unknown> = {};
    const endpoint = isDraft ? `/Drafts(${id})` : `/PurchaseInvoices(${id})`;

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbNameResolved = session?.companyDB || "";
      if (dbNameResolved) {
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        let successDb = false;
        if (!isDraft) {
          try {
            const invoiceRepo = await getTenantRepository(dbNameResolved, APInvoiceSchema);
            const invoiceDoc = await invoiceRepo.findOne({
              where: { docEntry: Number(id) },
              select: ["docNum", "atcEntry"],
            });
            if (invoiceDoc) {
              docNum = invoiceDoc.docNum;
              existingAttachmentEntry = invoiceDoc.atcEntry ?? null;
              successDb = true;
            }
          } catch (dbErr: any) {
            logger.warn(
              { id, err: dbErr.message },
              "Failed to query database for doc info, falling back to Service Layer GET",
            );
          }
        }

        if (!successDb) {
          // Fallback to Service Layer GET if database query fails or document not found (e.g. for drafts)
          try {
            const getEndpoint = isDraft
              ? `/Drafts(${id})?$select=DocNum,AttachmentEntry`
              : `/PurchaseInvoices(${id})?$select=DocNum,AttachmentEntry`;
            const docData = await serviceLayerClient.request<any>(sessionId, "GET", getEndpoint);
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

        const { attachmentEntry, shouldUpdateDoc } =
          await attachmentsService.syncAttachmentsOnUpdate(
            sessionId,
            dbNameResolved,
            "APInvoice",
            id,
            docNum,
            payload.attachments as any[],
            existingAttachmentEntry,
          );

        if (shouldUpdateDoc) {
          sapPayload.AttachmentEntry = attachmentEntry;
        }
      }
    }

    if (payload.Comments !== undefined) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.NumAtCard !== undefined) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }
    if (payload.Address !== undefined) {
      sapPayload.Address = payload.Address;
    }
    if (payload.Address2 !== undefined) {
      sapPayload.Address2 = payload.Address2;
    }
    if (payload.DocDate !== undefined) {
      sapPayload.DocDate = payload.DocDate;
    }
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }

    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      sapPayload.DocumentLines = lines.map((item) => {
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
      });
    }

    // PATCH request to SAP: Partial updates are standard for meta fields like comments.
    await serviceLayerClient.request(sessionId, "PATCH", endpoint, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Invalidate dashboard metrics to reflect any potential status changes (though comments usually don't).
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB && !isDraft) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: isDraft
        ? "A/P Invoice draft updated successfully"
        : "A/P Invoice updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/P Invoice",
    });
    throw caughtError;
  }
};

// Cancels an A/P Invoice in SAP. This is a irreversible operational action in SAP B1.
export const cancelInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseInvoices(${id})/Cancel`);

    // Invalidate dashboard metrics to reflect the removal of this invoice from transactional totals.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { message: "A/P Invoice cancelled successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/P Invoice",
    });
    throw caughtError;
  }
};

// Reopens a closed A/P Invoice in the SAP system.
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
      error: caughtError.message,
      id,
      msg: "Failed to reopen A/P Invoice",
    });
    throw caughtError;
  }
};

export const apInvoiceService = {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoiceByDocNum,
  getInvoiceDocNums,
  getInvoices,
  reopenInvoice,
  updateInvoice,
};
