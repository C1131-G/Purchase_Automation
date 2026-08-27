// A/P Credit Memo Service: Logic for A/P Credit Memos, combining HANA database queries for lists and SAP Service Layer for detailed document operations.

import { executeTenantQuery } from "@/db/tenant-query";
import type { CreditNoteFilters } from "./ap-credit-memo.types";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import {
  buildIcCardCodePredicate,
  getIcPartnerCodes,
} from "@/modules/intercompany/api/ic-partner-scope";
// Fetches a paginated list of A/P Credit Memos from HANA.
// Uses TypeORM's query builder to construct dynamic filters based on user search criteria.

export const getCreditNotes = async (dbName: string, filters: CreditNoteFilters) => {
  try {
    const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];
      const partnerPredicate = buildIcCardCodePredicate('"CardCode"', allowedCardCodes);
      whereClauses.push(partnerPredicate.sql);
      params.push(...partnerPredicate.params);

      if (isDraft) {
        whereClauses.push(`"ObjType" = '19'`);
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
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", "Address", "Address2", 0 AS "PaidToDate"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "Address", "Address2", "PaidToDate"`;

      const sql = `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subCreditNote = buildSubQuery("ORPC", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subCreditNote.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subCreditNote.params, ...subDraft.params];

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
      data: dataRows.map((row: any) => {
        const docTotal = Number(row.DocTotal || 0);
        const paidToDate = Number(row.PaidToDate || 0);
        return {
          BalanceDue: Math.round((docTotal - paidToDate) * 100) / 100,
          CardCode: row.CardCode,
          CardName: row.CardName,
          DocCurr: resolveCurrencyCode(row.DocCurr, displayCurrency),
          DocDate: row.DocDate,
          DocNum: row.DocNum,
          DocStatus: row.DocStatus === "O" ? "Open" : row.DocStatus === "C" ? "Closed" : "Draft",
          DocTotal: docTotal,
          Address: row.Address,
          Address2: row.Address2,
          id: row.DocEntry,
        };
      }),
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
