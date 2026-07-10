// Sales Order Service: Orchestrates order processing flows. Interfaces with HANA for high-volume order queries and Service Layer for document lifecycle management (Creation, Update, Cancellation).

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getCachedData, purgeCache } from "@/core/utils/cache";
import { executeTenantQuery, getTenantRepository } from "@/dal/tenant-dal.helper";
import type { SalesOrderFilters } from "@/dal/types/sales-order.types";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "./attachments.service";

// Fetches a filtered and paginated list of Sales Orders from the tenant-specific HANA database.
// Uses a UNION ALL pattern to combine final documents (ORDR) with drafts (ODRF, ObjType='17').
export const getSalesOrders = async (dbName: string, filters: SalesOrderFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '17'`);
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

    const subSO = buildSubQuery("ORDR", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subSO.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subSO.params, ...subDraft.params];

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
        DocStatus:
          row.DocStatus === "O"
            ? "Open"
            : row.DocStatus === "C"
              ? "Closed"
              : row.DocStatus === "D"
                ? "Draft"
                : row.DocStatus,
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

export const getSalesOrderDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, SalesOrderSchema);
  const queryBuilder = repo.createQueryBuilder("so");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("so.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(so.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("so.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Obtains the full Sales Order document structure from SAP, used for detail views.
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
    let attachments: import("./attachments.service").FileMetadata[] = [];
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
      error: caughtError.message,
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
export const createSalesOrder = async (sessionId: string, payload: Record<string, unknown>) => {
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
    const resolvedDbName = session?.companyDB || "";

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
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "17";
    }

    // Standardize date into ISO format (YYYY-MM-DD) for Service Layer ingestion.
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

    const endpoint = isDraft ? "/Drafts" : "/Orders";
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      endpoint,
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      docEntry: result.DocEntry,
      docNum: result.DocNum,
      msg: isDraft ? "Sales order draft created in SAP" : "Sales order created in SAP",
    });

    if (!isDraft && draftDocEntry) {
      logger.info({ draftDocEntry, msg: "Deleting source draft after sales order conversion" });
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

    // Invalidate the sales dashboard cache as revenue and order counts have changed.
    if (resolvedDbName) {
      purgeCache(`dash:sales:${resolvedDbName}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "SalesOrder",
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
        ? "Sales Order Draft saved successfully"
        : "Sales Order created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create sales order in Service Layer",
    });
    throw caughtError;
  }
};

export const updateSalesOrder = async (
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
            const soRepo = await getTenantRepository(dbName, SalesOrderSchema);
            const soDoc = await soRepo.findOne({
              where: { docEntry: Number(id) },
              select: ["docNum", "atcEntry"],
            });
            if (soDoc) {
              docNum = soDoc.docNum;
              existingAttachmentEntry = soDoc.atcEntry ?? null;
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
                `/Orders(${id})?$select=DocNum,AttachmentEntry`,
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
            isDraft ? "SalesOrderDraft" : "SalesOrder",
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
    const endpoint = isDraft ? `/Drafts(${docEntry})` : `/Orders(${id})`;
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      sapPayload.DocumentLines = lines.map((line) => {
        const docLine: Record<string, unknown> = {
          LineNum: line.LineNum !== undefined ? Number(line.LineNum) : undefined,
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          VatGroup: line.VatGroup as string,
          WarehouseCode: line.WarehouseCode ?? ((line as any).WhsCode as string),
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
      id: docEntry,
      lineCount: Array.isArray(sapPayload.DocumentLines) ? sapPayload.DocumentLines.length : 0,
      msg: "Sales order update payload prepared",
    });

    await serviceLayerClient.request(sessionId, "PATCH", endpoint, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Invalidate dashboard metrics to ensure real-time reporting accuracy.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: isDraft
        ? "Sales Order Draft saved successfully"
        : "Sales Order updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update sales order in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the standard cancellation procedure in SAP B1 for the given Sales Order.
export const cancelSalesOrder = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Orders(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "Sales Order canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel sales order in Service Layer",
    });
    throw caughtError;
  }
};

// Fetches the active list of Sales Employees (Sales Persons) from the tenant's HANA DB.
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
          error: caughtError.message,
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

export const getOpenSalesOrderLines = async (sessionId: string, cardCode: string) => {
  try {
    const query = `/Orders?$filter=CardCode eq '${cardCode}' and DocumentStatus eq 'bost_Open'`;
    const result = (await serviceLayerClient.request(sessionId, "GET", query)) as {
      value: SAPDocumentResponse[];
    };

    const orders = result.value || [];
    const openLines: {
      DocEntry: number;
      DocNum: number;
      DocDate: string;
      DocCurr: string;
      LineNum: number;
      ItemCode: string;
      ItemDescription?: string;
      Quantity: number;
      OpenQty: number;
      Price?: number;
      TaxCode?: string;
      WarehouseCode?: string;
      UoMCode?: string | number;
      UoMEntry?: number;
      DiscountPercent?: number;
      VatGroup?: string;
      VatPrcnt?: number;
    }[] = [];

    for (const order of orders) {
      const lines = order.DocumentLines || [];
      for (const line of lines) {
        const lineWithStatus = line as SAPDocumentLine & {
          LineStatus?: string;
        };
        if (lineWithStatus.LineStatus === "bost_Open") {
          const lineWithOpenQty = lineWithStatus as SAPDocumentLine & {
            LineStatus?: string;
            OpenQuantity?: number;
            RemainingOpenQuantity?: number;
            RemainingOpenInventoryQuantity?: number;
            RemainingQuantity?: number;
            BaseOpenQuantity?: number;
            UoMCode?: string | number;
            UoMEntry?: number;
          };
          openLines.push({
            DiscountPercent:
              Number(line.DiscountPercent ?? 0) ||
              Number((order as unknown as { DiscountPercent?: number }).DiscountPercent ?? 0),
            DocCurr: order.DocCurrency,
            DocDate: order.DocDate,
            DocEntry: order.DocEntry,
            DocNum: order.DocNum,
            ItemCode: line.ItemCode,
            ItemDescription: line.ItemDescription,
            LineNum: lineWithOpenQty.LineNum ?? 0,
            OpenQty: Number(
              lineWithOpenQty.OpenQuantity ??
                lineWithOpenQty.RemainingOpenQuantity ??
                lineWithOpenQty.RemainingOpenInventoryQuantity ??
                lineWithOpenQty.RemainingQuantity ??
                lineWithOpenQty.BaseOpenQuantity ??
                line.Quantity,
            ),
            Price: line.Price || line.UnitPrice,
            Quantity: line.Quantity,
            UoMCode: lineWithOpenQty.UoMCode,
            UoMEntry: lineWithOpenQty.UoMEntry,
            VatGroup: lineWithOpenQty.VatGroup || String(lineWithOpenQty.TaxCode ?? "").trim(),
            VatPrcnt: Number(lineWithOpenQty.TaxPercentagePerRow ?? lineWithOpenQty.VatPrcnt ?? 0),
            WarehouseCode: line.WarehouseCode,
          });
        }
      }
    }

    logger.info({
      count: openLines.length,
      msg: "DEBUG: Mapped Open Lines",
      samples: openLines.slice(0, 2),
    });

    return openLines;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      cardCode,
      error: caughtError.message,
      msg: "Failed to fetch open sales order lines from Service Layer",
    });
    throw caughtError;
  }
};

export const salesOrderService = {
  cancelSalesOrder,
  createSalesOrder,
  getOpenSalesOrderLines,
  getSalesEmployees,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesOrderDocNums,
  getSalesOrders,
  updateSalesOrder,
};
