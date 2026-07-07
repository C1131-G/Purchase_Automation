import type { ColumnFiltersState } from "@tanstack/react-table";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type { TransferListParams } from "@/features/table-pages/transfer/api/transfer.service";
import type { TransferSearch } from "@/features/table-pages/transfer/schemas/transfer-search.schema";
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

const SORTABLE_FIELDS = new Set(["DocNum", "DocDate", "Filler", "ToWhsCode", "DocTotal"]);

export const mapSearchToTransferListParams = (search: TransferSearch): TransferListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const docDate = getDateRangeFilter(filters, "DocDate");
  const start = docDate?.from ?? docDate?.to;
  const end = docDate?.to ?? docDate?.from;
  const docTotal = getDocTotalFilter(filters);

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined;
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as TransferListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    DocNum: getStringFilter(filters, "DocNum") ?? search.DocNum,
    Comments: getStringFilter(filters, "Comments") ?? search.Comments,
    DocStatus: getStringFilter(filters, "DocStatus") ?? (search as any).DocStatus,
    Filler: getStringFilter(filters, "Filler") ?? search.Filler,
    ToWhsCode: getStringFilter(filters, "ToWhsCode") ?? search.ToWhsCode,
    DocDateStart: start ?? search.DocDateStart,
    DocDateEnd: end ?? search.DocDateEnd,
    DocTotal: docTotal?.value ?? search.DocTotal,
    DocTotalOperator: docTotal?.operator ?? search.DocTotalOperator,
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
