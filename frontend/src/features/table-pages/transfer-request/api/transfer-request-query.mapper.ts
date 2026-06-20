import type { ColumnFiltersState } from "@tanstack/react-table";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type { TransferRequestListParams } from "@/features/table-pages/transfer-request/api/transfer-request.service";
import type { TransferRequestSearch } from "@/features/table-pages/transfer-request/schemas/transfer-request-search.schema";
import { isDateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";
import type { DateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";

const findFilter = (filters: ColumnFiltersState, id: string) => filters.find((f) => f.id === id);

const getStringFilter = (filters: ColumnFiltersState, id: string): string | undefined => {
  const value = findFilter(filters, id)?.value;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

interface NumberComparisonFilter {
  operator: "eq" | "lt" | "gt";
  value: number;
}

const getDocTotalFilter = (filters: ColumnFiltersState): NumberComparisonFilter | undefined => {
  const value = findFilter(filters, "DocTotal")?.value;
  if (!value || typeof value !== "object" || !("operator" in value) || !("value" in value)) {
    return undefined;
  }
  return value as NumberComparisonFilter;
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

const SORTABLE_FIELDS = new Set([
  "DocNum",
  "DocDate",
  "DocStatus",
  "DocTotal",
  "Filler",
  "ToWhsCode",
]);

export const mapSearchToTransferRequestListParams = (
  search: TransferRequestSearch,
): TransferRequestListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const docDate = getDateRangeFilter(filters, "DocDate");
  const start = docDate?.from ?? docDate?.to;
  const end = docDate?.to ?? docDate?.from;

  const docTotal = getDocTotalFilter(filters);

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined;
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as TransferRequestListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    DocNum: getStringFilter(filters, "DocNum") || search.DocNum,
    Comments: getStringFilter(filters, "Comments") || search.Comments,
    DocStatus: getStringFilter(filters, "DocStatus") || search.DocStatus,
    Filler: getStringFilter(filters, "Filler") || search.Filler,
    ToWhsCode: getStringFilter(filters, "ToWhsCode") || search.ToWhsCode,
    DocDateStart: start || search.DocDateStart,
    DocDateEnd: end || search.DocDateEnd,
    DocTotal: docTotal?.value ?? search.DocTotal,
    DocTotalOperator: docTotal?.operator ?? search.DocTotalOperator,
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
