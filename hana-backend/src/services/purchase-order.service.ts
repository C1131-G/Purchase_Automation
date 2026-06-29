// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository, executeTenantQuery } from "@/dal/tenant-dal.helper";
import type { PurchaseOrderFilters } from "@/dal/types/purchase-order.types";
// Data Access & Schemas
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { GRPOHeaderSchema } from "@/db/schemas/grpoheader.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/services/attachments.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Retrieves a paginated list of Purchase Orders from the HANA database.
export const getPurchaseOrders = async (dbName: string, filters: PurchaseOrderFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '22'`);
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
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", "Address", "Address2"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "Address", "Address2"`;

      const sql = `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subPO = buildSubQuery("OPOR", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subPO.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subPO.params, ...subDraft.params];

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
        Address: row.Address,
        Address2: row.Address2,
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

// Returns distinct DocNum values for lookup/search popup.
export const getPurchaseOrderDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
  const queryBuilder = repo.createQueryBuilder("po");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("po.docNum", "DocNum")
    .addSelect("po.cardCode", "CardCode")
    .addSelect("po.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(po.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }

  queryBuilder.orderBy("po.docNum", "DESC");
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

// Requests a specific PO document from the Service Layer, including item lines.
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
    let attachments = [];
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
      error: caughtError.message,
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
export const createPurchaseOrder = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
  try {
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

    if (!isDraft) {
      // Validate UoM before sending to SAP
      const inputLines = (payload.DocumentLines as Record<string, unknown>[]) || [];
      const linesMissingUom = inputLines
        .map((line) => ({
          itemCode: String(line.ItemCode ?? "").trim(),
          uomCode: String(line.UoMCode ?? line.UomCode ?? "").trim(),
          uomEntry: Number(line.UoMEntry ?? line.UomEntry),
        }))
        .filter((line) => !line.uomCode && !Number.isFinite(line.uomEntry));

      if (linesMissingUom.length > 0) {
        const missingItems = linesMissingUom.map((line) => line.itemCode || "<unknown>");
        logger.warn({
          missingItems,
          msg: "Purchase order payload has lines without UoMCode/UoMEntry",
        });
        throw new AppError(
          `Missing UoM for item(s): ${missingItems.join(", ")}`,
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

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
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((item) => {
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
      }),
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "22";
    }

    // Formats DocDate into SAP-compliant YYYY-MM-DD.
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

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseOrders",
      sapPayload,
    )) as SAPDocumentResponse;

    // Invalidate the procurement dashboard metrics for this tenant.
    const resolvedDbNameFromRes =
      result.CompanyDB || result.DBName || session?.companyDB || resolvedDbName;
    if (resolvedDbNameFromRes) {
      purgeCache(`dash:purchase:${resolvedDbNameFromRes}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbNameFromRes,
          "PurchaseOrder",
          result.DocEntry,
          result.DocNum,
          absoluteEntry,
          attachments,
        );
      }
    }

    if (!isDraft && Number.isFinite(draftDocEntry) && draftDocEntry > 0) {
      try {
        await serviceLayerClient.request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`);
        logger.info({
          draftDocEntry,
          msg: "Deleted converted purchase order draft",
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
      message: isDraft
        ? "Purchase Order Draft saved successfully"
        : "Purchase Order created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create purchase order in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable fields (Comments, DueDate) on an existing PO.
export const updatePurchaseOrder = async (
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
          const poRepo = await getTenantRepository(dbName, PurchaseOrderSchema);
          const poDoc = await poRepo.findOne({
            where: { docEntry: Number(id) },
            select: ["docNum", "atcEntry"],
          });
          if (poDoc) {
            docNum = poDoc.docNum;
            existingAttachmentEntry = poDoc.atcEntry ?? null;
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
                : `/PurchaseOrders(${id})?$select=DocNum,AttachmentEntry`,
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
            "PurchaseOrder",
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

    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      isDraft ? `/Drafts(${id})` : `/PurchaseOrders(${id})`,
      sapPayload,
      true,
      { "B1S-ReplaceCollectionsOnPatch": "true" },
    );

    // Dashboard metrics must be refreshed to reflect potential total spend changes.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: isDraft
        ? "Purchase Order Draft saved successfully"
        : "Purchase Order updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update purchase order in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the cancellation workflow for a PO in SAP.
export const cancelPurchaseOrder = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseOrders(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "Purchase Order cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel purchase order in Service Layer",
    });
    throw caughtError;
  }
};

export const purchaseOrderService = {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
  getPurchaseOrderDocNums,
  getPurchaseOrders,
  updatePurchaseOrder,
};
