import { type SortingState } from '@tanstack/react-table'
import { create } from 'zustand'

import { type Updater } from '@/store/table/table-store.types'

// Sorting Store: Manages active column sorting states (ID + Direction) synchronized with URL parameters.

type SortingStore = {
  tables: Record<string, SortingState>
  setSorting: (tableId: string, sorting: Updater<SortingState>) => void
  resetSorting: (tableId: string) => void
}

const EMPTY_SORTING: SortingState = []

export const useTableSortingStore = create<SortingStore>((set) => ({
  tables: {},
  setSorting: (tableId, sorting) =>
    set((prev) => {
      const current = prev.tables[tableId] || EMPTY_SORTING
      const next = typeof sorting === 'function' ? sorting(current) : sorting
      return { tables: { ...prev.tables, [tableId]: next } }
    }),
  resetSorting: (tableId) =>
    set((prev) => ({
      tables: { ...prev.tables, [tableId]: EMPTY_SORTING },
    })),
}))

export const useSetSortingAction = () => useTableSortingStore((state) => state.setSorting)
