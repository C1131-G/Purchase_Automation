import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { executeTenantQuery, getTenantRepository } from "@/dal/tenant-dal.helper";
import type { GRPOFilters } from "@/dal/types/grpo.types";
// Data Access & Schemas
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { APInvoiceHeaderSchema } from "@/db/schemas/apinvoiceheader.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

import { resolveBaseLineQuantities } from "./base-qty-validation.util";
import { reconcilePOAfterCopyTo } from "./po-reconcile.util";
import { attachmentsService } from "./attachments.service";

// Fetches a paginated list of GRPOs from the HANA database with dynamic search filters.
export const getGRPOs = async (dbName: string, filters: GRPOFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '20'`);
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

    const subGRPO = buildSubQuery("OPDN", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subGRPO.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subGRPO.params, ...subDraft.params];

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

export const getGRPODocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, GRPOSchema);
  const queryBuilder = repo.createQueryBuilder("grpo");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("grpo.docNum", "DocNum")
    .addSelect("grpo.cardCode", "CardCode")
    .addSelect("grpo.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(grpo.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("grpo.docNum", "DESC");
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

// Requests a list of open Purchase Orders for a specific vendor from the Service Layer.
// This is typically called at the start of the GRPO creation wizard.
export const getAvailablePOs = async (sessionId: string, vendorCode: string) => {
  try {
    if (!vendorCode) {
      return [];
    }

    // Filters for "bost_Open" so only valid, unfulfilled POs are returned for receipting.
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders?$filter=CardCode eq '${vendorCode}' and DocumentStatus eq 'bost_Open'&$select=DocEntry,DocNum,DocDate,CardCode,CardName,DocTotal`,
    )) as { value: SAPDocumentResponse[] };

    logger.info({
      count: result.value?.length || 0,
      msg: "Available POs fetched for vendor",
      vendorCode,
    });

    // Map SAP fields to internal frontend-friendly property names.
    const mappedPOs = (result.value || []).map((po: SAPDocumentResponse) => ({
      id: po.DocEntry,
      poDate: po.DocDate,
      purchaseOrderNo: po.DocNum.toString(),
      total: po.DocTotal,
      vendorCode: po.CardCode,
      vendorName: po.CardName,
      vendorRefNumber: "",
    }));

    return mappedPOs;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to fetch available POs",
      vendorCode,
    });
    return [];
  }
};

// Fetches deep document details for a specific PO, including itemized lines.
// This data is used to pre-populate the GRPO creation form.
export const getPODetail = async (sessionId: string, dbName: string, id: string) => {
  try {
    const normalizedId = id.trim();
    let poDocEntry = normalizedId;

    // Resolves DocNum to DocEntry from HANA if necessary, ensuring Service Layer compatibility.
    const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
    const match = await repo
      .createQueryBuilder("po")
      .select(["po.docEntry"])
      .where("CAST(po.docNum AS NVARCHAR) = :id", { id: normalizedId })
      .getOne();

    if (match?.docEntry) {
      poDocEntry = String(match.docEntry);
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders(${poDocEntry})`,
    )) as SAPDocumentResponse;

    const mappedLines = (result.DocumentLines || []).map((line: SAPDocumentLine) => {
      const lineData = line as unknown as Record<string, unknown>;
      const sapTaxRate = Number(lineData.TaxPercentagePerRow ?? lineData.VatPrcnt ?? 0);
      const vatGroup = line.VatGroup || String(lineData.TaxCode ?? "").trim();

      return {
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Price: line.Price || line.UnitPrice,
        Quantity: line.Quantity,
        TaxCode: String(lineData.TaxCode ?? "").trim(),
        UoMCode: lineData.UoMCode,
        UoMEntry: lineData.UoMEntry,
        VatGroup: vatGroup,
        VatPrcnt: sapTaxRate,
        WarehouseCode: line.WarehouseCode,
      };
    });

    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      CardCode: result.CardCode,
      CardName: result.CardName,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocTotal: result.DocTotal,
      DocumentLines: mappedLines,
      NumAtCard: result.NumAtCard,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch PO details for GRPO",
    });
    throw caughtError;
  }
};

// Obtains the full GRPO document structure from the Service Layer.
export const getGRPO = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/PurchaseDeliveryNotes(${id})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    const enrichedLines = (result.DocumentLines || []).map((line: SAPDocumentLine) => {
      const lineData = line as unknown as Record<string, unknown>;
      const normalized = normalizeSAPLineData(lineData);
      const sapTaxRate = Number(lineData.TaxPercentagePerRow ?? lineData.VatPrcnt ?? 0);
      const vatGroup = normalized.VatGroup || String(lineData.TaxCode ?? "").trim();

      return {
        ...normalized,
        OpenQty: Number(
          lineData.OpenQuantity ??
            lineData.RemainingOpenQuantity ??
            lineData.RemainingQuantity ??
            lineData.BaseOpenQuantity ??
            line.Quantity ??
            0,
        ),
        VatGroup: vatGroup,
        VatPrcnt: sapTaxRate,
      };
    });

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let attachments = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(sessionId, attachmentEntry, dbName);
    }
    if (attachments.length === 0 && dbName) {
      attachments = await attachmentsService.getLocalAttachments(dbName, "GRPO", result.DocEntry);
    }

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
      NumAtCard: result.NumAtCard,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch GRPO from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a GRPO by its DocNum from the local HANA database to get its Service Layer DocEntry.
export const getGRPOByDocNum = async (
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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '20' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getGRPO(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  // 1. Check OPDN (real document)
  const repo = await getTenantRepository(dbName, GRPOSchema);
  const match = await repo
    .createQueryBuilder("grpo")
    .select(["grpo.docEntry"])
    .where("CAST(grpo.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (match?.docEntry) {
    const grpoDocEntry = String(match.docEntry);
    const grpoDetail = await getGRPO(sessionId, grpoDocEntry);

    // Calculate remaining open quantity per line by querying consumed quantities from PCH1 (AP Invoice lines).
    const pch1Repo = await getTenantRepository(dbName, APInvoiceHeaderSchema);
    const consumedLines = await pch1Repo
      .createQueryBuilder("pch1")
      .select("pch1.baseLine", "baseLine")
      .addSelect("SUM(pch1.quantity)", "consumedQty")
      .where("pch1.baseEntry = :baseEntry", { baseEntry: grpoDetail.DocEntry })
      .andWhere("pch1.baseType = 20")
      .groupBy("pch1.baseLine")
      .getRawMany<{ baseLine: number; consumedQty: string }>();

    const consumedByLine = new Map<number, number>();
    for (const row of consumedLines) {
      consumedByLine.set(Number(row.baseLine), Number(row.consumedQty ?? 0));
    }

    // Enrich lines with calculated OpenQty.
    const enrichedLines = (grpoDetail.DocumentLines || []).map((line: Record<string, unknown>) => {
      const lineNum = Number(line.LineNum ?? 0);
      const orderedQty = Number(line.Quantity ?? 0);
      const consumedQty = Number(consumedByLine.get(lineNum) ?? 0);
      const openQty = Math.max(0, orderedQty - consumedQty);

      return {
        ...line,
        OpenQty: openQty,
      };
    });

    return {
      ...grpoDetail,
      DocumentLines: enrichedLines,
    };
  }

  // 2. Check ODRF (draft document)
  const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '20' AND CAST("DocNum" AS NVARCHAR) = ?`;
  const draftMatch = (await executeTenantQuery(dbName, draftQuery, [normalizedDocNum])) as any[];

  if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
    return getGRPO(sessionId, String(draftMatch[0].DocEntry), true);
  }

  throw new AppError("GRPO not found", 404, "NOT_FOUND");
};

// Creates a GRPO document in SAP. Crucially, it links each line back to its source Purchase Order.
export const createGRPO = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
  try {
    const isDraft = payload.isDraft === true;
    const draftDocEntry = Number(payload.draftDocEntry || 0);
    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

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

    if (!isDraft && dbName && lines.length > 0) {
      await resolveBaseLineQuantities(sessionId, lines);
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
        const line: Record<string, unknown> = {
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
          line.UoMEntry = Math.trunc(uomEntry);
          line.UseBaseUnit = "tNO";
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            line.UoMCode = uomCode as string | number;
            line.UseBaseUnit = "tNO";
          }
        }

        // SAP Required: BaseType 22 indicates this line references a Purchase Order.
        // We only include these fields if we have a valid BaseEntry and BaseLine.
        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          line.BaseType = item.BaseType ?? 22;
          line.BaseEntry = item.BaseEntry;
          line.BaseLine = item.BaseLine;
        }

        return line;
      }),
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "20";
    }

    // Standardizes date format for SAP.
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

    // Submit the creation request to the PurchaseDeliveryNotes endpoint.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseDeliveryNotes",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge purchase dashboard cache as the PO statues and totals have likely changed.
    if (resolvedDbName) {
      purgeCache(`dash:purchase:${resolvedDbName}:`);
      if (!isDraft && result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "GRPO",
          result.DocEntry,
          result.DocNum,
          absoluteEntry,
          attachments,
        );
      }
    }

    // Reconcile originating PO(s) after GRPO save.
    // Walks back to the PO from base linkage and closes it if fully consumed.
    // Skip reconciliation for draft saves.
    if (!isDraft && dbName) {
      await reconcilePOAfterCopyTo(sessionId, dbName, lines);
    }

    // Delete the draft after successful conversion to a real document.
    if (!isDraft && Number.isFinite(draftDocEntry) && draftDocEntry > 0) {
      try {
        await serviceLayerClient.request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`);
        logger.info({
          draftDocEntry,
          msg: "Deleted converted GRPO draft",
        });
      } catch (delErr: any) {
        logger.error({
          draftDocEntry,
          error: delErr.message,
          msg: "Failed to delete draft after conversion",
        });
      }
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: isDraft ? "GRPO Draft saved successfully" : "GRPO created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create GRPO in Service Layer",
    });
    throw caughtError;
  }
};

// Updates secondary fields (like Comments) on an existing GRPO.
export const updateGRPO = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const isDraft = payload.isDraft === true;
    const sapPayload: Record<string, unknown> = {};

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

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        // Fetch DocNum and existing AttachmentEntry directly from HANA database via TypeORM
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        let successDb = false;
        try {
          const grpoRepo = await getTenantRepository(dbName, GRPOSchema);
          const grpoDoc = await grpoRepo.findOne({
            where: { docEntry: Number(id) },
            select: ["docNum", "atcEntry"],
          });
          if (grpoDoc) {
            docNum = grpoDoc.docNum;
            existingAttachmentEntry = grpoDoc.atcEntry ?? null;
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
                : `/PurchaseDeliveryNotes(${id})?$select=DocNum,AttachmentEntry`,
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
            "GRPO",
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

    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      isDraft ? `/Drafts(${id})` : `/PurchaseDeliveryNotes(${id})`,
      sapPayload,
      true,
      { "B1S-ReplaceCollectionsOnPatch": "true" },
    );

    // Invalidate dashboard metrics for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: isDraft ? "GRPO Draft saved successfully" : "GRPO updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update GRPO in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the cancellation flow for a GRPO document in SAP B1.
export const cancelGRPO = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseDeliveryNotes(${id})/Cancel`);

    // Cache must be cleared to reflect the reversal of item receipt.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "GRPO cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel GRPO in Service Layer",
    });
    throw caughtError;
  }
};

export const grpoService = {
  cancelGRPO,
  createGRPO,
  getAvailablePOs,
  getGRPO,
  getGRPOByDocNum,
  getGRPODocNums,
  getGRPOs,
  getPODetail,
  updateGRPO,
};
