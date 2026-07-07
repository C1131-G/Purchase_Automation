import { and, eq, ilike, or, sql, desc, asc } from "drizzle-orm";

export const buildSqlListFilters = (table: any, filters: any, sortColumns: Record<string, any>) => {
  const cardCode = filters.CardCode ?? filters.cardCode;
  const cardName = filters.CardName ?? filters.cardName;
  const docNum = filters.DocNum ?? filters.docNum;
  const dateFrom = filters.DocDateStart ?? filters.dateFrom;
  const dateTo = filters.DocDateEnd ?? filters.dateTo;
  const docStatus = filters.DocStatus ?? filters.docStatus;
  const docTotal = filters.DocTotal ?? filters.docTotal;
  const docTotalOperator = filters.DocTotalOperator ?? filters.docTotalOperator;

  // Extra filters for parity
  const comments = filters.Comments ?? filters.comments;
  const jrnlMemo = filters.JrnlMemo ?? filters.jrnlMemo;
  const taxDateStart = filters.TaxDateStart ?? filters.taxDateStart;
  const taxDateEnd = filters.TaxDateEnd ?? filters.taxDateEnd;
  const filler = filters.Filler ?? filters.filler;
  const toWhsCode = filters.ToWarehouseCode ?? filters.ToWhsCode ?? filters.toWhsCode;
  const counterRef = filters.CounterRef ?? filters.counterRef;
  const paymentMode = filters.PaymentMode ?? filters.paymentMode;

  const conditions: any[] = [];

  // CardCode filter: case-insensitive wildcard match
  if (cardCode && table.cardCode) {
    conditions.push(ilike(table.cardCode, `%${cardCode}%`));
  }

  // Comments filter: case-insensitive wildcard match
  if (comments && table.comments) {
    conditions.push(ilike(table.comments, `%${comments}%`));
  }

  // JrnlMemo filter: case-insensitive wildcard match
  if (jrnlMemo && table.jrnlMemo) {
    conditions.push(ilike(table.jrnlMemo, `%${jrnlMemo}%`));
  }

  // Tax Date range filters
  if (taxDateStart && table.taxDate) {
    conditions.push(sql`${table.taxDate} >= ${taxDateStart}`);
  }
  if (taxDateEnd && table.taxDate) {
    conditions.push(sql`${table.taxDate} <= ${taxDateEnd}`);
  }

  // Filler (from warehouse) filter: case-insensitive wildcard match
  if (filler && table.filler) {
    conditions.push(ilike(table.filler, `%${filler}%`));
  }

  // To Warehouse filter: case-insensitive wildcard match on table.toWarehouseCode
  if (toWhsCode && table.toWarehouseCode) {
    conditions.push(ilike(table.toWarehouseCode, `%${toWhsCode}%`));
  }

  // CounterRef filter: case-insensitive wildcard match
  if (counterRef && table.counterRef) {
    conditions.push(ilike(table.counterRef, `%${counterRef}%`));
  }

  // PaymentMode filter: case-insensitive wildcard match
  if (paymentMode && table.paymentMode) {
    conditions.push(ilike(table.paymentMode, `%${paymentMode}%`));
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
