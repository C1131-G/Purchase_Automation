// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import { getTenantRepository, executeTenantQuery } from "@/db/tenant-query";
import type { PurchaseOrderFilters } from "./purchase-order.types";
// Data Access & Schemas
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import {
  buildIcCardCodePredicate,
  getIcPartnerCodes,
} from "@/modules/intercompany/api/ic-partner-scope";
import { buildIcDocumentLineageSql } from "@/modules/intercompany/infrastructure/ic-document-lineage";
// Retrieves a paginated list of Purchase Orders from the HANA database.

export const getPurchaseOrders = async (dbName: string, filters: PurchaseOrderFilters) => {
  try {
    const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const lineageSql = isDraft ? undefined : buildIcDocumentLineageSql("buyer");
      const params: unknown[] = lineageSql ? [dbName] : [];
      const partnerPredicate = buildIcCardCodePredicate('"CardCode"', allowedCardCodes);
      whereClauses.push(partnerPredicate.sql);
      params.push(...partnerPredicate.params);

      if (isDraft) {
        whereClauses.push(`"ObjType" = '22'`);
      }

      if (filters.DocNum) {
        whereClauses.push(`CAST("DocNum" AS NVARCHAR) LIKE ?`);
        params.push(`%${filters.DocNum}%`);
      }

      if (filters.SqDocNum) {
        if (isDraft) whereClauses.push("1=0");
        else {
          whereClauses.push(`LOWER(CAST("ic"."SqDocNum" AS NVARCHAR)) LIKE LOWER(?)`);
          params.push(`%${filters.SqDocNum}%`);
        }
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
        const totalOperator = opMap[filters.DocTotalOperator as keyof typeof opMap];
        if (totalOperator) {
          whereClauses.push(`"DocTotal" ${totalOperator} ?`);
          params.push(filters.DocTotal);
        }
      }

      const selectColumns = isDraft
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", "Address", "Address2", CAST(NULL AS NVARCHAR(100)) AS "SqDocNum"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "Address", "Address2", "ic"."SqDocNum"`;

      const sql = lineageSql
        ? `SELECT ${selectColumns} FROM "${table}" LEFT JOIN (${lineageSql}) "ic" ON "ic"."PoDocEntry" = CAST("DocEntry" AS NVARCHAR) WHERE ${whereClauses.join(" AND ")}`
        : `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
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
      SqDocNum: `"SqDocNum"`,
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
    const displayCurrency = await getDisplayCurrency(dbName);

    return {
      data: dataRows.map((row: any) => ({
        CardCode: row.CardCode,
        CardName: row.CardName,
        DocCurr: resolveCurrencyCode(row.DocCurr, displayCurrency),
        DocDate: row.DocDate,
        DocNum: row.DocNum,
        DocStatus: row.DocStatus === "O" ? "Open" : row.DocStatus === "C" ? "Closed" : "Draft",
        DocTotal: row.DocTotal,
        SqDocNum: row.SqDocNum == null ? null : String(row.SqDocNum),
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
  const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
  const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
  const queryBuilder = repo.createQueryBuilder("po");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("po.docNum", "DocNum")
    .addSelect("po.cardCode", "CardCode")
    .addSelect("po.cardName", "CardName")
    .distinct(true);
  if (allowedCardCodes.length === 0) queryBuilder.where("1=0");
  else queryBuilder.where("po.cardCode IN (:...allowedCardCodes)", { allowedCardCodes });

  if (search && search.trim().length > 0) {
    queryBuilder.andWhere("CAST(po.docNum AS NVARCHAR) LIKE :search", {
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
