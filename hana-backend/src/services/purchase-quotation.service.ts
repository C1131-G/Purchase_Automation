// Purchase Quotation Service: Orchestrates vendor quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository, executeTenantQuery } from "@/dal/tenant-dal.helper";
import { getDisplayCurrency } from "@/services/currency.util";
import type { PurchaseQuotationFilters } from "@/dal/types/purchase-quotation.types";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { PurchaseQuotationLineSchema } from "@/db/schemas/purchase-quotation-line.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/services/attachments.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

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
export const getPurchaseQuotations = async (dbName: string, filters: PurchaseQuotationFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '540000006'`);
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
        const opMap = { eq: "=", lt: "<", gt: ">" };
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

    const subPQ = buildSubQuery("OPQT", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subPQ.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subPQ.params, ...subDraft.params];

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

export const getPurchaseQuotationDocNums = async (
  dbName: string,
  search?: string,
  limit?: number,
) => {
  const repo = await getTenantRepository(dbName, PurchaseQuotationSchema);
  const queryBuilder = repo.createQueryBuilder("pq");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("pq.docNum", "DocNum")
    .addSelect("pq.cardCode", "CardCode")
    .addSelect("pq.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(pq.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("pq.docNum", "DESC");
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

// Obtains the full Purchase Quotation document structure from SAP, used for detail views.
export const getPurchaseQuotation = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/PurchaseQuotations(${id})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let attachments = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(sessionId, attachmentEntry, dbName);
    }
    if (attachments.length === 0 && dbName) {
      attachments = await attachmentsService.getLocalAttachments(
        dbName,
        "PurchaseQuotation",
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
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      Comments: result.Comments,
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard ?? "",
      AttachmentEntry: attachmentEntry,
      attachments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        const normalized = normalizeSAPLineData(lineData);
        // PQT1.PQTReqQty is the user-entered quantity on a Purchase Quotation,
        // while PQT1.Quantity stays 0 by design. Surface RequiredQuantity as
        // Quantity in the API response so the vendor portal edit/copy-from
        // hydration reads the same value the user originally entered.
        // Do not overwrite OpenQty here: SAP's real OpenQty must flow through
        // unchanged so that downstream copy-to cascades (PO/GRPO/AP Invoice)
        // can use the actual remaining quantity for partial-fulfillment checks.
        const requiredQuantity = Number(
          lineData.RequiredQuantity ?? lineData.requiredQuantity ?? 0,
        );
        if (requiredQuantity > 0) {
          normalized.Quantity = requiredQuantity;
        }
        return normalized;
      }),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch purchase quotation from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a Purchase Quotation by DocNum from tenant DB and fetches full details from Service Layer.
export const getPurchaseQuotationByDocNum = async (
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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '540000006' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getPurchaseQuotation(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  // 1. Check OPQT (real document)
  const repo = await getTenantRepository(dbName, PurchaseQuotationSchema);
  const match = await repo
    .createQueryBuilder("pq")
    .select(["pq.docEntry"])
    .where("CAST(pq.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (match?.docEntry) {
    return getPurchaseQuotation(sessionId, String(match.docEntry), false);
  }

  // 2. Check ODRF (draft document)
  const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '540000006' AND CAST("DocNum" AS NVARCHAR) = ?`;
  const draftMatch = (await executeTenantQuery(dbName, draftQuery, [normalizedDocNum])) as any[];

  if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
    return getPurchaseQuotation(sessionId, String(draftMatch[0].DocEntry), true);
  }

  throw new AppError("Purchase Quotation not found", 404, "NOT_FOUND");
};

// Posts a new Purchase Quotation to the Service Layer using the /PurchaseQuotations endpoint.
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
          error: delErr.message,
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
      error: caughtError.message,
      msg: "Failed to create purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable document fields (Comments, Address, Lines).
export const updatePurchaseQuotation = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const isDraft = payload.isDraft === true;
    const sapPayload: Record<string, unknown> = {};

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        // Fetch DocNum and existing AttachmentEntry directly from HANA database via TypeORM
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        let successDb = false;
        try {
          const pqRepo = await getTenantRepository(dbName, PurchaseQuotationSchema);
          const pqDoc = await pqRepo.findOne({
            where: { docEntry: Number(id) },
            select: ["docNum", "atcEntry"],
          });
          if (pqDoc) {
            docNum = pqDoc.docNum;
            existingAttachmentEntry = pqDoc.atcEntry ?? null;
            successDb = true;
          }
        } catch (dbErr: any) {
          logger.warn(
            { id, err: dbErr.message },
            "Failed to query database for doc info, falling back to Service Layer GET",
          );
        }

        if (!successDb) {
          // Fallback to Service Layer GET if database query fails or document not found (e.g. for drafts)
          try {
            const docData = await serviceLayerClient.request<any>(
              sessionId,
              "GET",
              isDraft
                ? `/Drafts(${id})?$select=DocNum,AttachmentEntry`
                : `/PurchaseQuotations(${id})?$select=DocNum,AttachmentEntry`,
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

        const { attachmentEntry, shouldUpdateDoc } =
          await attachmentsService.syncAttachmentsOnUpdate(
            sessionId,
            dbName,
            "PurchaseQuotation",
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
    if ((payload as Record<string, unknown>).RequriedDate !== undefined) {
      sapPayload.RequriedDate = (payload as Record<string, unknown>).RequriedDate;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      sapPayload.DocumentLines = lines.map((line) => {
        // Mirror the create path: drive DocTotal via PQT1.Quantity,
        // carry the required-qty semantic in PQT1.PQTReqQty, and keep
        // PQT1.ShipDate in lockstep with PQT1.ReqDate.
        const reqDate = normalizeSapDateValue(
          line.ReqDate ??
            line.RequiredDate ??
            line.requiredDate ??
            payload.DocDueDate ??
            payload.DocDate,
        );
        const docLine: Record<string, unknown> = {
          LineNum: line.LineNum !== undefined ? Number(line.LineNum) : undefined,
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
      });
    }

    logger.info({
      changedFields: Object.keys(sapPayload),
      id,
      lineCount: Array.isArray(sapPayload.DocumentLines) ? sapPayload.DocumentLines.length : 0,
      msg: "Purchase quotation update payload prepared",
    });

    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      isDraft ? `/Drafts(${id})` : `/PurchaseQuotations(${id})`,
      sapPayload,
      true,
      {
        "B1S-ReplaceCollectionsOnPatch": "true",
      },
    );

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: isDraft
        ? "Purchase Quotation Draft updated successfully"
        : "Purchase Quotation updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the standard cancellation procedure in SAP B1 for the given Purchase Quotation.
export const cancelPurchaseQuotation = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseQuotations(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "Purchase Quotation canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

export const getOpenPurchaseQuotationLines = async (dbName: string, cardCode: string) => {
  try {
    logger.info({ cardCode, dbName, msg: "Fetching Open PQ Lines via HANA" });

    const headerRepo = await getTenantRepository(dbName, PurchaseQuotationSchema);
    const rows = (await headerRepo
      .createQueryBuilder("h")
      .innerJoin(PurchaseQuotationLineSchema as any, "l", '"l"."DocEntry" = "h"."DocEntry"')
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

    logger.info({ count: openLines.length, msg: "Open PQ lines from HANA" });

    return openLines;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      cardCode,
      error: caughtError.message,
      msg: "Failed to fetch open PQ lines from HANA",
    });
    throw caughtError;
  }
};

export const purchaseQuotationService = {
  cancelPurchaseQuotation,
  createPurchaseQuotation,
  getOpenPurchaseQuotationLines,
  getPurchaseQuotation,
  getPurchaseQuotationByDocNum,
  getPurchaseQuotationDocNums,
  getPurchaseQuotations,
  updatePurchaseQuotation,
};
