// Purchase Quotation Service: Orchestrates vendor quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import { getTenantRepository, executeTenantQuery } from "@/db/tenant-query";
import type { PurchaseQuotationFilters } from "./purchase-quotation.types";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import {
  buildIcCardCodePredicate,
  getIcPartnerCodes,
} from "@/modules/intercompany/api/ic-partner-scope";
import { listPqCopyAllowedDocEntries } from "@/modules/intercompany";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import { buildIcDocumentLineageSql } from "@/modules/intercompany/infrastructure/ic-document-lineage";

// Fetches a filtered and paginated list of Purchase Quotations from the tenant-specific HANA database.

export const getPurchaseQuotations = async (dbName: string, filters: PurchaseQuotationFilters) => {
  try {
    const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
    const copyAllowedDocEntries = filters.rfqSubmittedOnly
      ? await listPqCopyAllowedDocEntries(dbName)
      : null;

    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const lineageSql = isDraft ? undefined : buildIcDocumentLineageSql("buyer");
      const params: unknown[] = lineageSql ? [dbName] : [];
      const partnerPredicate = buildIcCardCodePredicate('"CardCode"', allowedCardCodes);
      whereClauses.push(partnerPredicate.sql);
      params.push(...partnerPredicate.params);

      if (isDraft) {
        whereClauses.push(`"ObjType" = '540000006'`);
      }

      if (copyAllowedDocEntries) {
        if (copyAllowedDocEntries.length === 0) {
          whereClauses.push("1=0");
        } else {
          whereClauses.push(`"DocEntry" IN (${copyAllowedDocEntries.map(() => "?").join(", ")})`);
          params.push(...copyAllowedDocEntries);
        }
      }

      if (filters.DocNum) {
        whereClauses.push(`CAST("DocNum" AS NVARCHAR) LIKE ?`);
        params.push(`%${filters.DocNum}%`);
      }

      if (filters.RfqNumber) {
        if (isDraft) whereClauses.push("1=0");
        else {
          whereClauses.push(`LOWER(CAST("ic"."RfqNumber" AS NVARCHAR)) LIKE LOWER(?)`);
          params.push(`%${filters.RfqNumber}%`);
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
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", CAST(NULL AS NVARCHAR(100)) AS "RfqNumber"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "ic"."RfqNumber"`;

      const sql = lineageSql
        ? `SELECT ${selectColumns} FROM "${table}" LEFT JOIN (${lineageSql}) "ic" ON "ic"."PqDocEntry" = CAST("DocEntry" AS NVARCHAR) WHERE ${whereClauses.join(" AND ")}`
        : `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
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
      RfqNumber: `"RfqNumber"`,
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
        RfqNumber: row.RfqNumber == null ? null : String(row.RfqNumber),
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
  const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
  const repo = await getTenantRepository(dbName, PurchaseQuotationSchema);
  const queryBuilder = repo.createQueryBuilder("pq");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("pq.docNum", "DocNum")
    .addSelect("pq.cardCode", "CardCode")
    .addSelect("pq.cardName", "CardName")
    .distinct(true);
  if (allowedCardCodes.length === 0) queryBuilder.where("1=0");
  else queryBuilder.where("pq.cardCode IN (:...allowedCardCodes)", { allowedCardCodes });

  if (search && search.trim().length > 0) {
    queryBuilder.andWhere("CAST(pq.docNum AS NVARCHAR) LIKE :search", {
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
