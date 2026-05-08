import { create } from "zustand";

// Pagination Store: Mirror of TanStack table state and URL parameters (0-indexed pageIndex to 1-indexed backend page).
export interface TablePagination {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
}

/**
 * PaginationStore: Centralized management for feature grid pagination.
 * Synchronizes 0-indexed local states with 1-indexed URL/API parameters.
 */
interface PaginationStore {
  /** Registry of pagination states indexed by Table ID. */
  tables: Record<string, TablePagination>;
  /** initPagination: Ensures a table has a valid initial pagination state. */
  initPagination: (tableId: string, pagination: TablePagination) => void;
  /** setPagination: Updates partial pagination fields for a specific grid. */
  setPagination: (tableId: string, pagination: Partial<TablePagination>) => void;
  /** resetPagination: Restores default pagination (page 1, 10 items). */
  resetPagination: (tableId: string) => void;
}

const DEFAULT_PAGINATION: TablePagination = {
  pageIndex: 0,
  pageSize: 10,
  totalRows: 0,
};

export const useTablePaginationStore = create<PaginationStore>((set) => ({
  initPagination: (tableId, pagination) =>
    set((prev) => {
      if (prev.tables[tableId]) {
        return prev;
      }
      return { tables: { ...prev.tables, [tableId]: pagination } };
    }),
  resetPagination: (tableId) =>
    set((prev) => ({
      tables: { ...prev.tables, [tableId]: DEFAULT_PAGINATION },
    })),
  setPagination: (tableId, pagination) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_PAGINATION;
      return {
        tables: { ...prev.tables, [tableId]: { ...current, ...pagination } },
      };
    }),
  tables: {},
}));

export const useTablePagination = (tableId: string) =>
  useTablePaginationStore((state) => state.tables[tableId] || DEFAULT_PAGINATION);

export const useSetPaginationAction = () => useTablePaginationStore((state) => state.setPagination);
