import { create } from 'zustand'

// Pagination Store: Mirror of TanStack table state and URL parameters (0-indexed pageIndex to 1-indexed backend page).
export type TablePagination = {
  pageIndex: number
  pageSize: number
  totalRows: number
}

type PaginationStore = {
  tables: Record<string, TablePagination>
  initPagination: (tableId: string, pagination: TablePagination) => void
  setPagination: (tableId: string, pagination: Partial<TablePagination>) => void
  resetPagination: (tableId: string) => void
}

const DEFAULT_PAGINATION: TablePagination = {
  pageIndex: 0,
  pageSize: 10,
  totalRows: 0,
}

export const useTablePaginationStore = create<PaginationStore>((set) => ({
  tables: {},
  initPagination: (tableId, pagination) =>
    set((prev) => {
      if (prev.tables[tableId]) return prev
      return { tables: { ...prev.tables, [tableId]: pagination } }
    }),
  setPagination: (tableId, pagination) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_PAGINATION
      return { tables: { ...prev.tables, [tableId]: { ...current, ...pagination } } }
    }),
  resetPagination: (tableId) =>
    set((prev) => ({
      tables: { ...prev.tables, [tableId]: DEFAULT_PAGINATION },
    })),
}))

export const useTablePagination = (tableId: string) =>
  useTablePaginationStore((state) => state.tables[tableId] || DEFAULT_PAGINATION)

export const useTableTotalRows = (tableId: string) =>
  useTablePaginationStore((state) => state.tables[tableId]?.totalRows || 0)

export const useTablePageCount = (tableId: string) =>
  useTablePaginationStore((state) => {
    const pagination = state.tables[tableId]
    if (!pagination || pagination.totalRows === 0) return 0
    return Math.ceil(pagination.totalRows / pagination.pageSize)
  })

export const useSetPaginationAction = () => useTablePaginationStore((state) => state.setPagination)

export const useInitPaginationAction = () =>
  useTablePaginationStore((state) => state.initPagination)

export const useResetPaginationAction = () =>
  useTablePaginationStore((state) => state.resetPagination)
