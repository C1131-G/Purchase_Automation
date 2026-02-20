import { create } from 'zustand'

import { type Updater } from '@/store/table/table-store.types'

// Order Store: Categorizes display sequence of table columns synchronized with TanStack/URL parameters.

type OrderStore = {
  tables: Record<string, string[]>
  initOrder: (tableId: string, order: string[]) => void
  setOrder: (tableId: string, order: Updater<string[]>) => void
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
