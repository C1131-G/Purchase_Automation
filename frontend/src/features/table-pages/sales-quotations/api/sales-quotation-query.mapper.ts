/** Sales Quotation Search Mapper: Bridges URL search state with API request parameters. */
import type { ColumnFiltersState } from "@tanstack/react-table";

import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type {
  SalesQuotationListParams,
  SalesQuotationStatus,
} from "@/features/table-pages/sales-quotations/api/sales-quotation.service";
import type { SalesQuotationSearch } from "@/features/table-pages/sales-quotations/schemas/sales-quotation-search.schema";
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
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
]);

export const mapSearchToSalesQuotationListParams = (
  search: SalesQuotationSearch,
): SalesQuotationListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const docDate = getDateRangeFilter(filters, "DocDate");
  const docStatus = getEnumFilter<SalesQuotationStatus>(filters, "DocStatus", [
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
      ? (firstSort.id as SalesQuotationListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    CardCode: getStringFilter(filters, "CardCode"),
    CardName: getStringFilter(filters, "CardName"),
    DocDateEnd: end,
    DocDateStart: start,
    DocNum: getStringFilter(filters, "DocNum"),
    DocStatus: docStatus,
    DocTotal: docTotal?.value,
    DocTotalOperator: docTotal?.operator,
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
