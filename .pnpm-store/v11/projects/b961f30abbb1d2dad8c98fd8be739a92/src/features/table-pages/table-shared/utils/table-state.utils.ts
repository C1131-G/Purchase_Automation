import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";

export const cloneSorting = (sorting: SortingState): SortingState =>
  sorting.map((item) => ({ desc: item.desc, id: item.id }));

export const cloneVisibility = (visibility: VisibilityState): VisibilityState => ({
  ...visibility,
});

export const normalizeVisibility = (visibility: VisibilityState): VisibilityState =>
  Object.fromEntries(Object.entries(visibility).filter(([, visible]) => visible === false));

export const cloneOrder = (order: string[]): string[] => [...order];

export const cloneFilters = (filters: ColumnFiltersState): ColumnFiltersState =>
  filters.map((filter) => ({
    id: filter.id,
    value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
  }));
