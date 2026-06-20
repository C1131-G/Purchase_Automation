import type { ColumnFiltersState } from "@tanstack/react-table";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import type { ItemMasterListParams } from "@/features/table-pages/item-master/api/item-master.service";
import type { ItemMasterSearch } from "@/features/table-pages/item-master/schemas/item-master-search.schema";

const findFilter = (filters: ColumnFiltersState, id: string) => filters.find((f) => f.id === id);

const getStringFilter = (filters: ColumnFiltersState, id: string): string | undefined => {
  const value = findFilter(filters, id)?.value;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getNumberFilter = (filters: ColumnFiltersState, id: string): number | undefined => {
  const value = findFilter(filters, id)?.value;
  if (typeof value !== "number" && typeof value !== "string") {
    return undefined;
  }
  const parsed = Number(value);
  return isNaN(parsed) ? undefined : parsed;
};

const SORTABLE_FIELDS = new Set([
  "ItemCode",
  "ItemName",
  "ItmsGrpCod",
  "OnHand",
  "AvgPrice",
  "CodeBars",
]);

export const mapSearchToItemMasterListParams = (search: ItemMasterSearch): ItemMasterListParams => {
  const filters = normalizeColumnFilters(search.columnFilters);

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined;
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as ItemMasterListParams["sortBy"])
      : undefined;
  const sortOrder = firstSort ? (firstSort.desc ? "desc" : "asc") : undefined;

  return {
    ItemCode: getStringFilter(filters, "ItemCode") || search.ItemCode,
    ItemName: getStringFilter(filters, "ItemName") || search.ItemName,
    frozenFor: getStringFilter(filters, "frozenFor") || search.frozenFor,
    validFor: getStringFilter(filters, "validFor") || search.validFor,
    ItmsGrpCod: getNumberFilter(filters, "ItmsGrpCod") || search.ItmsGrpCod,
    InvntryUom: getStringFilter(filters, "InvntryUom") || search.InvntryUom,
    CodeBars: getStringFilter(filters, "CodeBars") || search.CodeBars,
    limit: Math.max(search.limit ?? 10, 1),
    page: Math.max(search.page ?? 1, 1),
    sortBy,
    sortOrder,
  };
};
