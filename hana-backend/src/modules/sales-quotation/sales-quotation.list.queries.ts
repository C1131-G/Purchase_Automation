// Sales Quotation Service: Orchestrates quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import type { SalesQuotationFilters } from "./sales-quotation.types";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import {
  buildIcCardCodePredicate,
  getIcPartnerCodes,
} from "@/modules/intercompany/api/ic-partner-scope";
import { buildIcDocumentLineageSql } from "@/modules/intercompany/infrastructure/ic-document-lineage";
// Fetches a filtered and paginated list of Sales Quotations from the tenant-specific HANA database.
// Uses a UNION ALL pattern to combine final documents (OQUT) with drafts (ODRF, ObjType='23'),
// matching the Purchase Order reference implementation.

export const getSalesQuotations = async (dbName: string, filters: SalesQuotationFilters) => {
  try {
    const allowedCardCodes = await getIcPartnerCodes(dbName, "sales");
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const lineageSql = isDraft ? undefined : buildIcDocumentLineageSql("seller");
      const params: unknown[] = lineageSql ? [dbName] : [];
      const partnerPredicate = buildIcCardCodePredicate('"CardCode"', allowedCardCodes);
      whereClauses.push(partnerPredicate.sql);
      params.push(...partnerPredicate.params);

      if (isDraft) {
        whereClauses.push(`"ObjType" = '23'`);
      }

      if (filters.DocNum) {
        whereClauses.push(`CAST("DocNum" AS NVARCHAR) LIKE ?`);
        params.push(`%${filters.DocNum}%`);
      }

      if (filters.PoDocNum) {
        if (isDraft) whereClauses.push("1=0");
        else {
          whereClauses.push(`LOWER(CAST("ic"."PoDocNum" AS NVARCHAR)) LIKE LOWER(?)`);
          params.push(`%${filters.PoDocNum}%`);
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
          // Drafts only appear when filtering for Draft status
          if (statusVal !== "D" && statusVal !== "Draft") {
            whereClauses.push("1=0");
          }
        } else {
          // Final documents exclude Draft filter
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
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", "Address", "Address2", CAST(NULL AS NVARCHAR(100)) AS "PoDocNum"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "Address", "Address2", "ic"."PoDocNum"`;

      const sql = lineageSql
        ? `SELECT ${selectColumns} FROM "${table}" LEFT JOIN (${lineageSql}) "ic" ON "ic"."SqDocEntry" = CAST("DocEntry" AS NVARCHAR) WHERE ${whereClauses.join(" AND ")}`
        : `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subSQ = buildSubQuery("OQUT", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subSQ.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subSQ.params, ...subDraft.params];

    const countSql = `SELECT COUNT(*) AS "total" FROM (${combinedSql}) AS "Counted"`;

    const sortFieldMap: Record<string, string> = {
      CardCode: `"CardCode"`,
      CardName: `"CardName"`,
      DocDate: `"DocDate"`,
      DocNum: `"DocNum"`,
      DocStatus: `"DocStatus"`,
      DocTotal: `"DocTotal"`,
      PoDocNum: `"PoDocNum"`,
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
        DocStatus:
          row.DocStatus === "O"
            ? "Open"
            : row.DocStatus === "C"
              ? "Closed"
              : row.DocStatus === "D"
                ? "Draft"
                : row.DocStatus,
        DocTotal: row.DocTotal,
        PoDocNum: row.PoDocNum == null ? null : String(row.PoDocNum),
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

export const getSalesQuotationDocNums = async (dbName: string, search?: string, limit?: number) => {
  const allowedCardCodes = await getIcPartnerCodes(dbName, "sales");
  const repo = await getTenantRepository(dbName, SalesQuotationSchema);
  const queryBuilder = repo.createQueryBuilder("sq");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("sq.docNum", "DocNum").distinct(true);
  if (allowedCardCodes.length === 0) queryBuilder.where("1=0");
  else queryBuilder.where("sq.cardCode IN (:...allowedCardCodes)", { allowedCardCodes });
  if (search && search.trim().length > 0) {
    queryBuilder.andWhere("CAST(sq.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("sq.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Obtains the full Sales Quotation document structure from SAP, used for detail views.
