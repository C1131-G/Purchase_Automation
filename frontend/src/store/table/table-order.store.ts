import { create } from 'zustand'

import { type Updater } from '@/store/table/table-store.types'

// Order Store: Categorizes display sequence of table columns synchronized with TanStack/URL parameters.

/**
 * OrderStore: Manages the column display sequence across feature grids.
 * Persists user-defined arrangement via URL serialization.
 */
type OrderStore = {
  /** Registry of column ID arrays indexed by Table ID. */
  tables: Record<string, string[]>
  /** initOrder: Establishes a baseline column sequence if none exists. */
  initOrder: (tableId: string, order: string[]) => void
  /** setOrder: Functional or direct update of column arrangement. */
  setOrder: (tableId: string, order: Updater<string[]>) => void
  /** resetOrder: Restores the grid to its factory default sequence. */
  resetOrder: (tableId: string, defaultOrder: string[]) => void
}

export const useTableOrderStore = create<OrderStore>((set) => ({
  tables: {},
  initOrder: (tableId, order) =>
    set((prev) => {
      if (prev.tables[tableId]) return prev
      return { tables: { ...prev.tables, [tableId]: order } }
    }),
  setOrder: (tableId, order) =>
    set((prev) => {
      const current = prev.tables[tableId] || []
      const next = typeof order === 'function' ? order(current) : order
      return { tables: { ...prev.tables, [tableId]: next } }
    }),
  resetOrder: (tableId, defaultOrder) =>
    set((prev) => ({
      tables: { ...prev.tables, [tableId]: defaultOrder },
    })),
}))

export const useSetOrderAction = () => useTableOrderStore((state) => state.setOrder)
