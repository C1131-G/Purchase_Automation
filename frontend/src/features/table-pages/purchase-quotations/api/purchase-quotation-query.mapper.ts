/** Purchase Quotation Search Mapper: Bridges URL search state with API request parameters. */
import type { ColumnFiltersState } from "@tanstack/react-table";

import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type {
  PurchaseQuotationListParams,
  PurchaseQuotationStatus,
} from "@/features/table-pages/purchase-quotations/api/purchase-quotation.service";
import type { PurchaseQuotationSearch } from "@/features/table-pages/purchase-quotations/schemas/purchase-quotation-search.schema";
import {
  isDateRangeFilter,
  isNumberComparisonFilter,
} from "@/features/table-pages/table-shared/utils/table-filter-values";
import type {
  DateRangeFilter,
  NumberComparisonFilter,
} from "@/features/table-pages/table-shared/utils/table-filter-values";

const findFilter = (filters: ColumnFiltersState, id: string) => filters.find((f) => f.id === id);

const getStringFilter = (filters: ColumnFiltersState, id: string): string | undefined => {
  const value = findFilter(filters, id)?.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  const strValue = String(value).trim();
  return strValue.length > 0 ? strValue : undefined;
};

const getEnumFilter = <T extends string>(
  filters: ColumnFiltersState,
  id: string,
  allowed: readonly T[],
): T | undefined => {
  const value = findFilter(filters, id)?.value;
  if (typeof value !== "string") {
    return undefined;
  }
  return allowed.includes(value as T) ? (value as T) : undefined;
};

const getDateRangeFilter = (
  filters: ColumnFiltersState,
  id: string,
): DateRangeFilter | undefined => {
  const value = findFilter(filters, id)?.value;
  if (!isDateRangeFilter(value)) {
    return undefined;
  }
  if (!value.from && !value.to) {
    return undefined;
  }
  if (value.from && value.to && value.from > value.to) {
    return { from: value.to, to: value.from };
  }
  return value;
};

const getDocTotalFilter = (filters: ColumnFiltersState): NumberComparisonFilter | undefined => {
  const value = findFilter(filters, "DocTotal")?.value;
  if (!isNumberComparisonFilter(value)) {
    return undefined;
  }
  return {
    operator: value.operator,
    value: value.value,
  };
};

const SORTABLE_FIELDS = new Set([
  "DocNum",
  "DocDate",
  "CardCode",
  "CardName",
  "DocTotal",
  "DocStatus",
  "RfqNumber",
]);

export const mapSearchToPurchaseQuotationListParams = (
  search: PurchaseQuotationSearch,
): PurchaseQuotationListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const docDate = getDateRangeFilter(filters, "DocDate");
  const docStatus = getEnumFilter<PurchaseQuotationStatus>(filters, "DocStatus", [
    "Open",
    "Closed",
    "Draft",
  ]);
  const docTotal = getDocTotalFilter(filters);

  const start = docDate?.from ?? docDate?.to;
  const end = docDate?.to ?? docDate?.from;

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined;
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as PurchaseQuotationListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    CardCode: getStringFilter(filters, "CardCode") ?? search.CardCode,
    CardName: getStringFilter(filters, "CardName") ?? search.CardName,
    DocDateEnd: end ?? search.DocDateEnd,
    DocDateStart: start ?? search.DocDateStart,
    DocNum: getStringFilter(filters, "DocNum") ?? search.DocNum,
    DocStatus: docStatus ?? (search.DocStatus as any),
    DocTotal: docTotal?.value ?? search.DocTotal,
    DocTotalOperator: docTotal?.operator ?? search.DocTotalOperator,
    RfqNumber: getStringFilter(filters, "RfqNumber") ?? search.RfqNumber,
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
