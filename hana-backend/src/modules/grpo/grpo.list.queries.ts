import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import type { GRPOFilters } from "./grpo.types";
// Data Access & Schemas
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import {
  buildIcCardCodePredicate,
  getIcPartnerCodes,
} from "@/modules/intercompany/api/ic-partner-scope";
// Fetches a paginated list of GRPOs from the HANA database with dynamic search filters.

export const getGRPOs = async (dbName: string, filters: GRPOFilters) => {
  try {
    const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];
      const partnerPredicate = buildIcCardCodePredicate('"CardCode"', allowedCardCodes);
      whereClauses.push(partnerPredicate.sql);
      params.push(...partnerPredicate.params);

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
        const totalOperator = opMap[filters.DocTotalOperator as keyof typeof opMap];
        if (totalOperator) {
          whereClauses.push(`"DocTotal" ${totalOperator} ?`);
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
  const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
  const repo = await getTenantRepository(dbName, GRPOSchema);
  const queryBuilder = repo.createQueryBuilder("grpo");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("grpo.docNum", "DocNum")
    .addSelect("grpo.cardCode", "CardCode")
    .addSelect("grpo.cardName", "CardName")
    .distinct(true);
  if (allowedCardCodes.length === 0) queryBuilder.where("1=0");
  else queryBuilder.where("grpo.cardCode IN (:...allowedCardCodes)", { allowedCardCodes });

  if (search && search.trim().length > 0) {
    queryBuilder.andWhere("CAST(grpo.docNum AS NVARCHAR) LIKE :search", {
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
