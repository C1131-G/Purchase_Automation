import { create } from 'zustand'
import { type ColumnFiltersState } from '@tanstack/react-table'
import { type DateRangeFilter } from '@/components/ui/types/table-filter-types'

interface FilterState {
    activeFilter: string | null
    columnFilters: ColumnFiltersState
    allowNextFilterPopoverOpen: boolean
    dateFilterDraft: Record<string, DateRangeFilter | null>
}

const EMPTY_ARRAY: any[] = []

interface FilterStore {
    tables: Record<string, FilterState>
    initFilters: (tableId: string, state: Partial<FilterState>) => void
    setActiveFilter: (tableId: string, filter: string | null) => void
    setColumnFilters: (tableId: string, filters: ColumnFiltersState) => void
    setAllowNextFilterPopoverOpen: (tableId: string, allow: boolean) => void
    setDateFilterDraft: (tableId: string, columnId: string, range: DateRangeFilter | null) => void
    clearDateFilterDraft: (tableId: string, columnId: string) => void
    clearAllFilters: (tableId: string) => void
    resetFilters: (tableId: string) => void
}

const DEFAULT_FILTER_STATE: FilterState = {
    activeFilter: null,
    columnFilters: [],
    allowNextFilterPopoverOpen: false,
    dateFilterDraft: {},
}

export const useTableFilterStore = create<FilterStore>((set) => ({
    tables: {},
    initFilters: (tableId, state) => set((prev) => {
        if (prev.tables[tableId]) return prev
        return { tables: { ...prev.tables, [tableId]: { ...DEFAULT_FILTER_STATE, ...state } } }
    }),
    setActiveFilter: (tableId, filter) => set((prev) => {
        const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
        return { tables: { ...prev.tables, [tableId]: { ...current, activeFilter: filter } } }
    }),
    setColumnFilters: (tableId, filters) => set((prev) => {
        const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
        return { tables: { ...prev.tables, [tableId]: { ...current, columnFilters: filters } } }
    }),
    setAllowNextFilterPopoverOpen: (tableId, allow) => set((prev) => {
        const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
        return { tables: { ...prev.tables, [tableId]: { ...current, allowNextFilterPopoverOpen: allow } } }
    }),
    setDateFilterDraft: (tableId, columnId, range) => set((prev) => {
        const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
        return {
            tables: {
                ...prev.tables,
                [tableId]: {
                    ...current,
                    dateFilterDraft: { ...current.dateFilterDraft, [columnId]: range }
                }
            }
        }
    }),
    clearDateFilterDraft: (tableId, columnId) => set((prev) => {
        const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
        const nextDrafts = { ...current.dateFilterDraft }
        delete nextDrafts[columnId]
        return {
            tables: {
                ...prev.tables,
                [tableId]: { ...current, dateFilterDraft: nextDrafts }
            }
        }
    }),
    clearAllFilters: (tableId) => set((prev) => {
        const current = prev.tables[tableId] || DEFAULT_FILTER_STATE
        return {
            tables: {
                ...prev.tables,
                [tableId]: {
                    ...current,
                    activeFilter: null,
                    columnFilters: [],
                    allowNextFilterPopoverOpen: false,
                    dateFilterDraft: {},
                },
            },
        }
    }),
    resetFilters: (tableId) => set((prev) => ({
        tables: { ...prev.tables, [tableId]: DEFAULT_FILTER_STATE }
    }))
}))

export const useTableActiveFilter = (tableId: string) =>
    useTableFilterStore((state) => state.tables[tableId]?.activeFilter || null)

export const useTableColumnFilters = (tableId: string) =>
    useTableFilterStore((state) => state.tables[tableId]?.columnFilters || EMPTY_ARRAY)

export const useAllowNextFilterPopoverOpen = (tableId: string) =>
    useTableFilterStore((state) => state.tables[tableId]?.allowNextFilterPopoverOpen ?? false)

export const useSetActiveFilterAction = () =>
    useTableFilterStore((state) => state.setActiveFilter)

export const useSetColumnFiltersAction = () =>
    useTableFilterStore((state) => state.setColumnFilters)

export const useSetAllowNextFilterPopoverOpenAction = () =>
    useTableFilterStore((state) => state.setAllowNextFilterPopoverOpen)

export const useClearAllFiltersAction = () =>
    useTableFilterStore((state) => state.clearAllFilters)

export const useInitFiltersAction = () =>
    useTableFilterStore((state) => state.initFilters)

export const useResetFiltersAction = () =>
    useTableFilterStore((state) => state.resetFilters)

export const useTableDateFilterDraft = (tableId: string, columnId: string) =>
    useTableFilterStore((state) => state.tables[tableId]?.dateFilterDraft[columnId] ?? null)

export const useSetDateFilterDraftAction = () =>
    useTableFilterStore((state) => state.setDateFilterDraft)

export const useClearDateFilterDraftAction = () =>
    useTableFilterStore((state) => state.clearDateFilterDraft)
