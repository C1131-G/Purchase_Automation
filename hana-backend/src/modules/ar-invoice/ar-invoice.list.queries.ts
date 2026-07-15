// A/R Invoice Service: Logic for A/R Invoices (Sales), utilizing HANA for listings and SAP Service Layer for transaction management.

import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
import type { InvoiceFilters } from "./ar-invoice.types";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
// Fetches a paginated list of A/R Invoices from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (OINV) with drafts (ODRF, ObjType='13').

export const getInvoices = async (dbName: string, filters: InvoiceFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '13'`);
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

      if (filters.NumAtCard) {
        whereClauses.push(`LOWER("NumAtCard") LIKE LOWER(?)`);
        params.push(`%${filters.NumAtCard}%`);
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
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", "NumAtCard", "Address", "Address2", 0 AS "PaidToDate"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "NumAtCard", "Address", "Address2", COALESCE("PaidToDate", 0) AS "PaidToDate"`;

      const sql = `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subInv = buildSubQuery("OINV", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subInv.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subInv.params, ...subDraft.params];

    const countSql = `SELECT COUNT(*) AS "total" FROM (${combinedSql}) AS "Counted"`;

    const sortFieldMap: Record<string, string> = {
      CardCode: `"CardCode"`,
      CardName: `"CardName"`,
      DocDate: `"DocDate"`,
      DocNum: `"DocNum"`,
      DocStatus: `"DocStatus"`,
      DocTotal: `"DocTotal"`,
      NumAtCard: `"NumAtCard"`,
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
        id: row.DocEntry,
        DocNum: row.DocNum,
        DocDate: row.DocDate,
        CardCode: row.CardCode,
        CardName: row.CardName,
        DocTotal: row.DocTotal,
        BalanceDue: Math.round((Number(row.DocTotal) - Number(row.PaidToDate ?? 0)) * 100) / 100,
        DocCurr: row.DocCurr,
        NumAtCard: row.NumAtCard,
        DocStatus:
          row.DocStatus === "O"
            ? "Open"
            : row.DocStatus === "C"
              ? "Closed"
              : row.DocStatus === "D"
                ? "Draft"
                : row.DocStatus,
        Address: row.Address,
        Address2: row.Address2,
        paidToDate: Number(row.PaidToDate ?? 0),
      })),
      limit,
      page,
      total,
      totalPages,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      err: caughtError,
      msg: "Failed to fetch A/R Invoices",
    });
    throw caughtError;
  }
};

export const getInvoiceDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ARInvoiceSchema);
  const queryBuilder = repo.createQueryBuilder("inv");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("inv.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(inv.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("inv.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Retrieves detailed data for a single A/R Invoice from the SAP Service Layer.
