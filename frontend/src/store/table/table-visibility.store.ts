import { create } from 'zustand'

import { type Updater } from '@/store/table/table-store.types'

// Visibility Store: Tracks column visibility toggles synchronized with persistent URL storage.

type TableVisibility = Record<string, boolean>

type VisibilityStore = {
  tables: Record<string, TableVisibility>
  initVisibility: (tableId: string, visibility: TableVisibility) => void
  setVisibility: (tableId: string, visibility: Updater<TableVisibility>) => void
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
