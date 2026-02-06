import { create } from 'zustand'
import { type SortingState } from '@tanstack/react-table'

interface SortingStore {
    tables: Record<string, SortingState>
    setSorting: (tableId: string, sorting: SortingState | ((prev: SortingState) => SortingState)) => void
    resetSorting: (tableId: string) => void
}

const EMPTY_SORTING: SortingState = []

export const useTableSortingStore = create<SortingStore>((set) => ({
    tables: {},
    setSorting: (tableId, sorting) => set((prev) => {
        const current = prev.tables[tableId] || EMPTY_SORTING
        const next = typeof sorting === 'function' ? sorting(current) : sorting
        return { tables: { ...prev.tables, [tableId]: next } }
    }),
    resetSorting: (tableId) => set((prev) => ({
        tables: { ...prev.tables, [tableId]: EMPTY_SORTING }
    }))
}))

export const useTableSorting = (tableId: string) =>
    useTableSortingStore((state) => state.tables[tableId] || EMPTY_SORTING)

export const useSetSortingAction = () =>
    useTableSortingStore((state) => state.setSorting)

export const useResetSortingAction = () =>
    useTableSortingStore((state) => state.resetSorting)
