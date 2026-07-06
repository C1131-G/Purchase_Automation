/** Outgoing Payment Search Mapper: Bridges URL search state with API request parameters. */
import type { ColumnFiltersState } from "@tanstack/react-table";

import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type { OutgoingPaymentListParams } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.service";
import type { OutgoingPaymentSearch } from "@/features/table-pages/outgoing-payment/schemas/outgoing-payment-search.schema";
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

const getSelectFilter = (filters: ColumnFiltersState, id: string): string | undefined => {
  const value = findFilter(filters, id)?.value;
  if (typeof value !== "string") {
    return undefined;
  }
  return value;
};

// Typed getter for PaymentMode to satisfy enum type
const getPaymentModeFilter = (
  filters: ColumnFiltersState,
  id: string,
): "M-Pesa" | "My Cash" | "EFTPOS" | "Direct Pay" | "CASH" | undefined => {
  const value = getSelectFilter(filters, id);
  if (!value) {
    return undefined;
  }
  const allowed: readonly string[] = ["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"];
  return allowed.includes(value as string)
    ? (value as "M-Pesa" | "My Cash" | "EFTPOS" | "Direct Pay" | "CASH")
    : undefined;
};

const SORTABLE_FIELDS = new Set([
  "DocNum",
  "DocDate",
  "CardCode",
  "CardName",
  "DocTotal",
  "PaymentMode",
]);

export const mapSearchToOutgoingPaymentListParams = (
  search: OutgoingPaymentSearch,
): OutgoingPaymentListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const docDate = getDateRangeFilter(filters, "DocDate");
  const start = docDate?.from ?? docDate?.to;
  const end = docDate?.to ?? docDate?.from;
  const docTotal = getDocTotalFilter(filters);

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined;
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as OutgoingPaymentListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    CardCode: getStringFilter(filters, "CardCode"),
    CardName: getStringFilter(filters, "CardName"),
    DocDateEnd: end,
    DocDateStart: start,
    DocNum: getStringFilter(filters, "DocNum"),
    DocTotal: docTotal?.value,
    DocTotalOperator: docTotal?.operator,
    PaymentMode: getPaymentModeFilter(filters, "PaymentMode"),
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
