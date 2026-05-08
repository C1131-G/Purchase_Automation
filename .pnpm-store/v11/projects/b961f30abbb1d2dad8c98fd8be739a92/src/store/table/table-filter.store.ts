import type { ColumnFiltersState } from "@tanstack/react-table";
import { create } from "zustand";

import type { DateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";

// Filter Store: Manages active filter selection (popovers) and ephemeral drafts synchronized with TanStack table state.
/**
 * FilterState: Tracks active filter selection, applied filters, and ephemeral drafts.
 * Supports deferred updates for complex filters like date ranges.
 */
interface FilterState {
  /** The currently open filter popover ID (e.g., column accessorKey). */
  activeFilter: string | null;
  /** Applied filters synchronized with TanStack Table state. */
  columnFilters: ColumnFiltersState;
  /** dateFilterDraft: Holds unsaved date range selections before 'Apply' is clicked. */
  dateFilterDraft: Record<string, DateRangeFilter | null>;
}

const EMPTY_ARRAY: ColumnFiltersState = [];

/**
 * FilterStore: Centralized management of complex grid filtering logic.
 * Ensures consistent behavior across sidebar lookups and inline table headers.
 */
interface FilterStore {
  /** Registry of filter states indexed by Table ID. */
  tables: Record<string, FilterState>;
  /** setActiveFilter: Opens/closes specific filter popovers. */
  setActiveFilter: (tableId: string, filter: string | null) => void;
  /** setColumnFilters: Updates the final applied filter set. */
  setColumnFilters: (tableId: string, filters: ColumnFiltersState) => void;
  /** setDateFilterDraft: Updates ephemeral date selection state. */
  setDateFilterDraft: (tableId: string, columnId: string, range: DateRangeFilter | null) => void;
  /** clearDateFilterDraft: Resets draft state for a specific date column. */
  clearDateFilterDraft: (tableId: string, columnId: string) => void;
  /** clearAllFilters: Performs a full reset of all active and draft filters. */
  clearAllFilters: (tableId: string) => void;
}

const DEFAULT_FILTER_STATE: FilterState = {
  activeFilter: null,
  columnFilters: [],
  dateFilterDraft: {},
};

export const useTableFilterStore = create<FilterStore>((set) => ({
  clearAllFilters: (tableId) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE;
      return {
        tables: {
          ...prev.tables,
          [tableId]: {
            ...current,
            activeFilter: null,
            columnFilters: [],
            dateFilterDraft: {},
          },
        },
      };
    }),
  clearDateFilterDraft: (tableId, columnId) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE;
      const nextDrafts = { ...current.dateFilterDraft };
      delete nextDrafts[columnId];
      return {
        tables: {
          ...prev.tables,
          [tableId]: { ...current, dateFilterDraft: nextDrafts },
        },
      };
    }),
  setActiveFilter: (tableId, filter) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE;
      return {
        tables: {
          ...prev.tables,
          [tableId]: { ...current, activeFilter: filter },
        },
      };
    }),
  setColumnFilters: (tableId, filters) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE;
      return {
        tables: {
          ...prev.tables,
          [tableId]: { ...current, columnFilters: filters },
        },
      };
    }),
  setDateFilterDraft: (tableId, columnId, range) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE;
      return {
        tables: {
          ...prev.tables,
          [tableId]: {
            ...current,
            dateFilterDraft: { ...current.dateFilterDraft, [columnId]: range },
          },
        },
      };
    }),
  tables: {},
}));

export const useTableActiveFilter = (tableId: string) =>
  useTableFilterStore((state) => state.tables[tableId]?.activeFilter || null);

export const useTableColumnFilters = (tableId: string) =>
  useTableFilterStore((state) => state.tables[tableId]?.columnFilters || EMPTY_ARRAY);

export const useSetActiveFilterAction = () => useTableFilterStore((state) => state.setActiveFilter);

export const useSetColumnFiltersAction = () =>
  useTableFilterStore((state) => state.setColumnFilters);

export const useClearAllFiltersAction = () => useTableFilterStore((state) => state.clearAllFilters);

export const useTableDateFilterDraft = (tableId: string, columnId: string) =>
  useTableFilterStore((state) => state.tables[tableId]?.dateFilterDraft[columnId] ?? null);

export const useSetDateFilterDraftAction = () =>
  useTableFilterStore((state) => state.setDateFilterDraft);

export const useClearDateFilterDraftAction = () =>
  useTableFilterStore((state) => state.clearDateFilterDraft);
