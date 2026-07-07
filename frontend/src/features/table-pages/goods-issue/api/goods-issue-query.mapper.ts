import type { ColumnFiltersState } from "@tanstack/react-table";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type { GoodsIssueListParams } from "@/features/table-pages/goods-issue/api/goods-issue.service";
import type { GoodsIssueSearch } from "@/features/table-pages/goods-issue/schemas/goods-issue-search.schema";
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

const SORTABLE_FIELDS = new Set(["DocNum", "DocDate", "TaxDate", "DocTotal"]);

export const mapSearchToGoodsIssueListParams = (search: GoodsIssueSearch): GoodsIssueListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const docDate = getDateRangeFilter(filters, "DocDate");
  const docDateStart = docDate?.from ?? docDate?.to;
  const docDateEnd = docDate?.to ?? docDate?.from;

  const taxDate = getDateRangeFilter(filters, "TaxDate");
  const taxDateStart = taxDate?.from ?? taxDate?.to;
  const taxDateEnd = taxDate?.to ?? taxDate?.from;

  const docTotal = getDocTotalFilter(filters);

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined;
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as GoodsIssueListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    DocNum: getStringFilter(filters, "DocNum") ?? search.DocNum,
    Comments: getStringFilter(filters, "Comments") ?? search.Comments,
    DocStatus: getStringFilter(filters, "DocStatus") ?? (search.DocStatus as any),
    DocDateStart: docDateStart ?? search.DocDateStart,
    DocDateEnd: docDateEnd ?? search.DocDateEnd,
    TaxDateStart: taxDateStart ?? search.TaxDateStart,
    TaxDateEnd: taxDateEnd ?? search.TaxDateEnd,
    DocTotalOperator: docTotal?.operator ?? search.DocTotalOperator,
    DocTotal: docTotal?.value ?? search.DocTotal,
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
