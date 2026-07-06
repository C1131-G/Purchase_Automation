import { and, eq, ilike, or, sql, desc, asc } from "drizzle-orm";

export const buildSqlListFilters = (table: any, filters: any, sortColumns: Record<string, any>) => {
  const cardCode = filters.cardCode;
  const cardName = filters.cardName;
  const docNum = filters.docNum;
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;
  const docStatus = filters.docStatus;
  const docTotal = filters.docTotal;
  const docTotalOperator = filters.docTotalOperator;

  const conditions: any[] = [];

  // CardCode filter: case-insensitive wildcard match
  if (cardCode && table.cardCode) {
    conditions.push(ilike(table.cardCode, `%${cardCode}%`));
  }

  // CardName filter: case-insensitive wildcard match
  if (cardName && table.cardName) {
    conditions.push(ilike(table.cardName, `%${cardName}%`));
  }

  // DocNum filter: cast to text and match wildcard.
  // Note: if filters.search is supplied, match either docNum or cardName (fallback).
  if (docNum && table.docNum) {
    if (filters.search) {
      const searchConditions: any[] = [sql`CAST(${table.docNum} AS TEXT) LIKE ${`%${docNum}%`}`];
      if (table.cardName) {
        searchConditions.push(ilike(table.cardName, `%${docNum}%`));
      }
      conditions.push(or(...searchConditions));
    } else {
      conditions.push(sql`CAST(${table.docNum} AS TEXT) LIKE ${`%${docNum}%`}`);
    }
  }

  // Date filters
  if (dateFrom && table.docDate) {
    conditions.push(sql`${table.docDate} >= ${dateFrom}`);
  }
  if (dateTo && table.docDate) {
    conditions.push(sql`${table.docDate} <= ${dateTo}`);
  }

  // DocStatus mapping ("Open" -> "O", "Closed" -> "C", "Draft" -> "D", "Partial" -> "P")
  if (docStatus && table.docStatus) {
    const statusMap: Record<string, string> = {
      Open: "O",
      Closed: "C",
      Draft: "D",
      Partial: "P",
      O: "O",
      C: "C",
      D: "D",
      P: "P",
    };
    const dbStatus = statusMap[docStatus];
    if (dbStatus) {
      conditions.push(eq(table.docStatus, dbStatus));
    }
  }

  // DocTotal filter
  if (docTotal !== undefined && docTotal !== null && table.docTotal) {
    const totalNum = Number(docTotal);
    if (!Number.isNaN(totalNum)) {
      if (docTotalOperator === "lt") {
        conditions.push(sql`${table.docTotal} < ${totalNum}`);
      } else if (docTotalOperator === "gt") {
        conditions.push(sql`${table.docTotal} > ${totalNum}`);
      } else {
        conditions.push(sql`${table.docTotal} = ${totalNum}`);
      }
    }
  }

  // Build where conditions
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Sorting
  // Priority:
  //   1. Explicit sortBy that maps to a known column → numeric/text sort on that column.
  //   2. Default: DocDate DESC, DocNum DESC (matches HANA list order).
  //      This fires both when no sortBy is provided AND when an unrecognised sortBy
  //      is supplied, so a stale URL param never silently drops the date tiebreaker.
  const sortBy = filters.sortBy;
  const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

  let orderBy: any;
  if (sortBy && sortColumns[sortBy]) {
    const col = sortColumns[sortBy];
    orderBy = sortOrder === "asc" ? asc(col) : desc(col);
  } else if (table.docDate && table.docNum) {
    // Default to DocDate DESC, DocNum DESC (matching HANA!)
    orderBy = sql`${table.docDate} DESC, ${table.docNum} DESC`;
  } else if (table.docNum) {
    orderBy = desc(table.docNum);
  }

  return { where, orderBy };
};
