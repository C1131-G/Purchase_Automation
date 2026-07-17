import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

import type { DateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";
import { createAppStore } from "@/store/lib/create-store";
import { applyUpdater, type Updater } from "@/store/lib/updater";

// Re-export for consumers that imported Updater from table-store.types
export type { Updater } from "@/store/lib/updater";

// ---------------------------------------------------------------------------
// Per-table slice state
// ---------------------------------------------------------------------------

export interface TablePagination {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
}

type TableVisibility = Record<string, boolean>;

interface FilterSliceState {
  activeFilter: string | null;
  columnFilters: ColumnFiltersState;
  dateFilterDraft: Record<string, DateRangeFilter | null>;
}

interface TableRegistryState {
  filters: Record<string, FilterSliceState>;
  pagination: Record<string, TablePagination>;
  order: Record<string, string[]>;
  sorting: Record<string, SortingState>;
  visibility: Record<string, TableVisibility>;
}

export interface TableStoreState extends TableRegistryState {
  // Filter actions
  setActiveFilter: (tableId: string, filter: string | null) => void;
  setColumnFilters: (tableId: string, filters: ColumnFiltersState) => void;
  setDateFilterDraft: (tableId: string, columnId: string, range: DateRangeFilter | null) => void;
  clearDateFilterDraft: (tableId: string, columnId: string) => void;
  clearAllFilters: (tableId: string) => void;

  // Pagination actions
  initPagination: (tableId: string, pagination: TablePagination) => void;
  setPagination: (tableId: string, pagination: Partial<TablePagination>) => void;
  resetPagination: (tableId: string) => void;

  // Order actions
  initOrder: (tableId: string, order: string[]) => void;
  setOrder: (tableId: string, order: Updater<string[]>) => void;
  resetOrder: (tableId: string, defaultOrder: string[]) => void;

  // Sorting actions
  setSorting: (tableId: string, sorting: Updater<SortingState>) => void;
  resetSorting: (tableId: string) => void;

  // Visibility actions
  initVisibility: (tableId: string, visibility: TableVisibility) => void;
  setVisibility: (tableId: string, visibility: Updater<TableVisibility>) => void;
  resetVisibility: (tableId: string) => void;

  /** Clears all UI state slices for a table id. */
  resetTable: (tableId: string, defaults?: { order?: string[] }) => void;
}

const DEFAULT_FILTER: FilterSliceState = {
  activeFilter: null,
  columnFilters: [],
  dateFilterDraft: {},
};

const DEFAULT_PAGINATION: TablePagination = {
  pageIndex: 0,
  pageSize: 10,
  totalRows: 0,
};

const EMPTY_SORTING: SortingState = [];
const EMPTY_FILTERS: ColumnFiltersState = [];

export function createTableStore() {
  return createAppStore<TableStoreState>({ name: "table-store", immer: true }, (set) => ({
    filters: {},
    pagination: {},
    order: {},
    sorting: {},
    visibility: {},

    setActiveFilter: (tableId, filter) =>
      set(
        (state) => {
          const current = state.filters[tableId] ?? { ...DEFAULT_FILTER };
          state.filters[tableId] = { ...current, activeFilter: filter };
        },
        false,
        "table/setActiveFilter",
      ),

    setColumnFilters: (tableId, filters) =>
      set(
        (state) => {
          const current = state.filters[tableId] ?? { ...DEFAULT_FILTER };
          state.filters[tableId] = { ...current, columnFilters: filters };
        },
        false,
        "table/setColumnFilters",
      ),

    setDateFilterDraft: (tableId, columnId, range) =>
      set(
        (state) => {
          const current = state.filters[tableId] ?? { ...DEFAULT_FILTER, dateFilterDraft: {} };
          state.filters[tableId] = {
            ...current,
            dateFilterDraft: { ...current.dateFilterDraft, [columnId]: range },
          };
        },
        false,
        "table/setDateFilterDraft",
      ),

    clearDateFilterDraft: (tableId, columnId) =>
      set(
        (state) => {
          const current = state.filters[tableId];
          if (!current) {
            return;
          }
          const nextDrafts = { ...current.dateFilterDraft };
          delete nextDrafts[columnId];
          state.filters[tableId] = { ...current, dateFilterDraft: nextDrafts };
        },
        false,
        "table/clearDateFilterDraft",
      ),

    clearAllFilters: (tableId) =>
      set(
        (state) => {
          state.filters[tableId] = {
            activeFilter: null,
            columnFilters: [],
            dateFilterDraft: {},
          };
        },
        false,
        "table/clearAllFilters",
      ),

    initPagination: (tableId, pagination) =>
      set(
        (state) => {
          if (state.pagination[tableId]) {
            return;
          }
          state.pagination[tableId] = pagination;
        },
        false,
        "table/initPagination",
      ),

    setPagination: (tableId, pagination) =>
      set(
        (state) => {
          const current = state.pagination[tableId] ?? { ...DEFAULT_PAGINATION };
          state.pagination[tableId] = { ...current, ...pagination };
        },
        false,
        "table/setPagination",
      ),

    resetPagination: (tableId) =>
      set(
        (state) => {
          state.pagination[tableId] = { ...DEFAULT_PAGINATION };
        },
        false,
        "table/resetPagination",
      ),

    initOrder: (tableId, order) =>
      set(
        (state) => {
          if (state.order[tableId]) {
            return;
          }
          state.order[tableId] = order;
        },
        false,
        "table/initOrder",
      ),

    setOrder: (tableId, order) =>
      set(
        (state) => {
          const current = state.order[tableId] ?? [];
          state.order[tableId] = applyUpdater(current, order);
        },
        false,
        "table/setOrder",
      ),

    resetOrder: (tableId, defaultOrder) =>
      set(
        (state) => {
          state.order[tableId] = defaultOrder;
        },
        false,
        "table/resetOrder",
      ),

    setSorting: (tableId, sorting) =>
      set(
        (state) => {
          const current = state.sorting[tableId] ?? EMPTY_SORTING;
          state.sorting[tableId] = applyUpdater(current, sorting);
        },
        false,
        "table/setSorting",
      ),

    resetSorting: (tableId) =>
      set(
        (state) => {
          state.sorting[tableId] = [];
        },
        false,
        "table/resetSorting",
      ),

    initVisibility: (tableId, visibility) =>
      set(
        (state) => {
          if (state.visibility[tableId]) {
            return;
          }
          state.visibility[tableId] = visibility;
        },
        false,
        "table/initVisibility",
      ),

    setVisibility: (tableId, visibility) =>
      set(
        (state) => {
          const current = state.visibility[tableId] ?? {};
          state.visibility[tableId] = applyUpdater(current, visibility);
        },
        false,
        "table/setVisibility",
      ),

    resetVisibility: (tableId) =>
      set(
        (state) => {
          state.visibility[tableId] = {};
        },
        false,
        "table/resetVisibility",
      ),

    resetTable: (tableId, defaults) =>
      set(
        (state) => {
          state.filters[tableId] = {
            activeFilter: null,
            columnFilters: [],
            dateFilterDraft: {},
          };
          state.pagination[tableId] = { ...DEFAULT_PAGINATION };
          state.sorting[tableId] = [];
          state.visibility[tableId] = {};
          if (defaults?.order) {
            state.order[tableId] = defaults.order;
          } else {
            delete state.order[tableId];
          }
        },
        false,
        "table/resetTable",
      ),
  }));
}

const tableStoreApi = createTableStore();

export const useTableStore = tableStoreApi.useStore;
export const createTableStoreInstance = tableStoreApi.createStore;

// ---------------------------------------------------------------------------
// Public selector / action hooks (stable names for table pages)
// ---------------------------------------------------------------------------

export const useTableActiveFilter = (tableId: string) =>
  useTableStore((state) => state.filters[tableId]?.activeFilter || null);

export const useTableColumnFilters = (tableId: string) =>
  useTableStore((state) => state.filters[tableId]?.columnFilters || EMPTY_FILTERS);

export const useTableDateFilterDraft = (tableId: string, columnId: string) =>
  useTableStore((state) => state.filters[tableId]?.dateFilterDraft[columnId] ?? null);

export const useSetActiveFilterAction = () => useTableStore((state) => state.setActiveFilter);
export const useSetColumnFiltersAction = () => useTableStore((state) => state.setColumnFilters);
export const useClearAllFiltersAction = () => useTableStore((state) => state.clearAllFilters);
export const useSetDateFilterDraftAction = () => useTableStore((state) => state.setDateFilterDraft);
export const useClearDateFilterDraftAction = () =>
  useTableStore((state) => state.clearDateFilterDraft);

export const useTablePagination = (tableId: string) =>
  useTableStore((state) => state.pagination[tableId] || DEFAULT_PAGINATION);

export const useSetPaginationAction = () => useTableStore((state) => state.setPagination);

export const useSetOrderAction = () => useTableStore((state) => state.setOrder);
export const useSetSortingAction = () => useTableStore((state) => state.setSorting);
export const useSetVisibilityAction = () => useTableStore((state) => state.setVisibility);

export const useResetTableAction = () => useTableStore((state) => state.resetTable);
