import { type ColumnFiltersState } from '@tanstack/react-table'
import { create } from 'zustand'

import { type DateRangeFilter } from '@/components/ui/types/table-filter-types'

/**
 * Filter Store Contract:
 * - UI STATE: Manages active filter selection (popovers) and ephemeral drafts.
 * - SYNC: `columnFilters` is a reactive mirror for UI updates (e.g. badges).
 * - CANONICAL: Real filtering logic persists in TanStack/URL params for deep linking.
 */
interface FilterState {
  activeFilter: string | null
  columnFilters: ColumnFiltersState
  dateFilterDraft: Record<string, DateRangeFilter | null>
}

const EMPTY_ARRAY: any[] = []

interface FilterStore {
  tables: Record<string, FilterState>
  setActiveFilter: (tableId: string, filter: string | null) => void
  setColumnFilters: (tableId: string, filters: ColumnFiltersState) => void
  setDateFilterDraft: (tableId: string, columnId: string, range: DateRangeFilter | null) => void
  clearDateFilterDraft: (tableId: string, columnId: string) => void
  clearAllFilters: (tableId: string) => void
}

const DEFAULT_FILTER_STATE: FilterState = {
  activeFilter: null,
  columnFilters: [],
  dateFilterDraft: {},
}

export const useTableFilterStore = create<FilterStore>((set) => ({
  tables: {},
  setActiveFilter: (tableId, filter) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
      return { tables: { ...prev.tables, [tableId]: { ...current, activeFilter: filter } } }
    }),
  setColumnFilters: (tableId, filters) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
      return { tables: { ...prev.tables, [tableId]: { ...current, columnFilters: filters } } }
    }),
  setDateFilterDraft: (tableId, columnId, range) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
      return {
        tables: {
          ...prev.tables,
          [tableId]: {
            ...current,
            dateFilterDraft: { ...current.dateFilterDraft, [columnId]: range },
          },
        },
      }
    }),
  clearDateFilterDraft: (tableId, columnId) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
      const nextDrafts = { ...current.dateFilterDraft }
      delete nextDrafts[columnId]
      return {
        tables: {
          ...prev.tables,
          [tableId]: { ...current, dateFilterDraft: nextDrafts },
        },
      }
    }),
  clearAllFilters: (tableId) =>
    set((prev) => {
      const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
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
      }
    }),
}))

export const useTableActiveFilter = (tableId: string) =>
  useTableFilterStore((state) => state.tables[tableId]?.activeFilter || null)

export const useTableColumnFilters = (tableId: string) =>
  useTableFilterStore((state) => state.tables[tableId]?.columnFilters || EMPTY_ARRAY)

export const useSetActiveFilterAction = () => useTableFilterStore((state) => state.setActiveFilter)

export const useSetColumnFiltersAction = () =>
  useTableFilterStore((state) => state.setColumnFilters)

export const useClearAllFiltersAction = () => useTableFilterStore((state) => state.clearAllFilters)

export const useTableDateFilterDraft = (tableId: string, columnId: string) =>
  useTableFilterStore((state) => state.tables[tableId]?.dateFilterDraft[columnId] ?? null)

export const useSetDateFilterDraftAction = () =>
  useTableFilterStore((state) => state.setDateFilterDraft)

export const useClearDateFilterDraftAction = () =>
  useTableFilterStore((state) => state.clearDateFilterDraft)
