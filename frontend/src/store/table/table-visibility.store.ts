import { create } from 'zustand'

import { type Updater } from '@/store/table/table-store.types'

// Visibility Store: Tracks column visibility toggles synchronized with persistent URL storage.

type TableVisibility = Record<string, boolean>

/**
 * VisibilityStore: Orchestrates column visibility toggles across feature grids.
 * Syncs user preferences with persistent URL storage for shareable views.
 */
type VisibilityStore = {
  /** Registry of column visibility maps indexed by Table ID. */
  tables: Record<string, TableVisibility>
  /** initVisibility: Establishes baseline visibility defaults for a grid. */
  initVisibility: (tableId: string, visibility: TableVisibility) => void
  /** setVisibility: Functional or direct update of column visibility state. */
  setVisibility: (tableId: string, visibility: Updater<TableVisibility>) => void
  /** resetVisibility: restores the table to showing all columns. */
  resetVisibility: (tableId: string) => void
}

export const useTableVisibilityStore = create<VisibilityStore>((set) => ({
  tables: {},
  initVisibility: (tableId, visibility) =>
    set((prev) => {
      if (prev.tables[tableId]) return prev
      return { tables: { ...prev.tables, [tableId]: visibility } }
    }),
  setVisibility: (tableId, visibility) =>
    set((prev) => {
      const current = prev.tables[tableId] || {}
      const next = typeof visibility === 'function' ? visibility(current) : visibility
      return { tables: { ...prev.tables, [tableId]: next } }
    }),
  resetVisibility: (tableId) =>
    set((prev) => ({
      tables: { ...prev.tables, [tableId]: {} },
    })),
}))

export const useSetVisibilityAction = () => useTableVisibilityStore((state) => state.setVisibility)
