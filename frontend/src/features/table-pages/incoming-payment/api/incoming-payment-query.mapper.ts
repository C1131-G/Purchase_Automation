/** Incoming Payment Search Mapper: Bridges URL search state with API request parameters. */
import type { ColumnFiltersState } from "@tanstack/react-table";

import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type { IncomingPaymentListParams } from "@/features/table-pages/incoming-payment/api/incoming-payment.service";
import type { IncomingPaymentSearch } from "@/features/table-pages/incoming-payment/schemas/incoming-payment-search.schema";
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

const SORTABLE_FIELDS = new Set(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal"]);

export const mapSearchToIncomingPaymentListParams = (
  search: IncomingPaymentSearch,
): IncomingPaymentListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const docDate = getDateRangeFilter(filters, "DocDate");
  const docTotal = getDocTotalFilter(filters);
  const counterRef = getStringFilter(filters, "CounterRef");

  const start = docDate?.from ?? docDate?.to;
  const end = docDate?.to ?? docDate?.from;

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined;
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as IncomingPaymentListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    CardCode: getStringFilter(filters, "CardCode") ?? search.CardCode,
    CardName: getStringFilter(filters, "CardName") ?? search.CardName,
    CounterRef: counterRef ?? search.CounterRef,
    DocDateEnd: end ?? search.DocDateEnd,
    DocDateStart: start ?? search.DocDateStart,
    DocNum: getStringFilter(filters, "DocNum") ?? search.DocNum,
    DocTotal: docTotal?.value ?? search.DocTotal,
    DocTotalOperator: docTotal?.operator ?? search.DocTotalOperator,
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
