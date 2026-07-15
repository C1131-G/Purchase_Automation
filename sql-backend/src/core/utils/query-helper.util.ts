import { and, eq, ilike, or, sql, desc, asc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { LooseColumn, LooseTable } from "@/types/db.types";

type FilterValues = Record<string, unknown>;
type SortColumnMap = Record<string, LooseColumn>;

const pushIlike = (conditions: SQL[], column: LooseColumn | undefined, value: unknown) => {
  if (value && column) {
    conditions.push(ilike(column, `%${String(value)}%`));
  }
};

const pushDateRange = (
  conditions: SQL[],
  column: LooseColumn | undefined,
  from: unknown,
  to: unknown,
) => {
  if (from && column) {
    conditions.push(sql`${column} >= ${from}`);
  }
  if (to && column) {
    conditions.push(sql`${column} <= ${to}`);
  }
};

const pushDocStatus = (conditions: SQL[], column: LooseColumn | undefined, docStatus: unknown) => {
  if (!(docStatus && column)) {
    return;
  }
  const statusMap: Record<string, string> = {
    C: "C",
    Closed: "C",
    D: "D",
    Draft: "D",
    O: "O",
    Open: "O",
    P: "P",
    Partial: "P",
  };
  const dbStatus = statusMap[String(docStatus)];
  if (dbStatus) {
    conditions.push(eq(column, dbStatus));
  }
};

const pushDocTotal = (
  conditions: SQL[],
  column: LooseColumn | undefined,
  docTotal: unknown,
  docTotalOperator: unknown,
) => {
  if (docTotal === undefined || docTotal === null || !column) {
    return;
  }
  const totalNum = Number(docTotal);
  if (Number.isNaN(totalNum)) {
    return;
  }
  if (docTotalOperator === "lt") {
    conditions.push(sql`${column} < ${totalNum}`);
  } else if (docTotalOperator === "gt") {
    conditions.push(sql`${column} > ${totalNum}`);
  } else {
    conditions.push(sql`${column} = ${totalNum}`);
  }
};

const pushDocNum = (conditions: SQL[], table: LooseTable, docNum: unknown, search: unknown) => {
  if (!(docNum && table.docNum)) {
    return;
  }
  if (search) {
    const searchConditions: SQL[] = [
      sql`CAST(${table.docNum} AS TEXT) LIKE ${`%${String(docNum)}%`}`,
    ];
    if (table.cardName) {
      searchConditions.push(ilike(table.cardName, `%${String(docNum)}%`));
    }
    const combined = or(...searchConditions);
    if (combined) {
      conditions.push(combined);
    }
  } else {
    conditions.push(sql`CAST(${table.docNum} AS TEXT) LIKE ${`%${String(docNum)}%`}`);
  }
};

const buildOrderBy = (
  table: LooseTable,
  filters: FilterValues,
  sortColumns: SortColumnMap,
): SQL => {
  const sortBy = filters.sortBy;
  const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
  if (typeof sortBy === "string" && sortColumns[sortBy]) {
    const col = sortColumns[sortBy];
    return sortOrder === "asc" ? asc(col) : desc(col);
  }
  if (table.docDate && table.docNum) {
    return sql`${table.docDate} DESC, ${table.docNum} DESC`;
  }
  if (table.docNum) {
    return desc(table.docNum);
  }
  return sql`1`;
};

export const buildSqlListFilters = (
  table: LooseTable,
  filters: FilterValues,
  sortColumns: SortColumnMap,
) => {
  const conditions: SQL[] = [];

  pushIlike(conditions, table.cardCode, filters.CardCode ?? filters.cardCode);
  pushIlike(conditions, table.comments, filters.Comments ?? filters.comments);
  pushIlike(conditions, table.jrnlMemo, filters.JrnlMemo ?? filters.jrnlMemo);
  pushIlike(conditions, table.filler, filters.Filler ?? filters.filler);
  pushIlike(
    conditions,
    table.toWarehouseCode,
    filters.ToWarehouseCode ?? filters.ToWhsCode ?? filters.toWhsCode,
  );
  pushIlike(conditions, table.counterRef, filters.CounterRef ?? filters.counterRef);
  pushIlike(conditions, table.paymentMode, filters.PaymentMode ?? filters.paymentMode);
  pushIlike(conditions, table.cardName, filters.CardName ?? filters.cardName);

  pushDateRange(
    conditions,
    table.taxDate,
    filters.TaxDateStart ?? filters.taxDateStart,
    filters.TaxDateEnd ?? filters.taxDateEnd,
  );
  pushDateRange(
    conditions,
    table.docDate,
    filters.DocDateStart ?? filters.dateFrom,
    filters.DocDateEnd ?? filters.dateTo,
  );

  pushDocNum(conditions, table, filters.DocNum ?? filters.docNum, filters.search);
  pushDocStatus(conditions, table.docStatus, filters.DocStatus ?? filters.docStatus);
  pushDocTotal(
    conditions,
    table.docTotal,
    filters.DocTotal ?? filters.docTotal,
    filters.DocTotalOperator ?? filters.docTotalOperator,
  );

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy = buildOrderBy(table, filters, sortColumns);

  return { orderBy, where };
};
