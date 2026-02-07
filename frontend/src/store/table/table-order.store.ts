import { create } from 'zustand'

interface OrderStore {
  tables: Record<string, string[]>
  initOrder: (tableId: string, order: string[]) => void
  setOrder: (tableId: string, order: string[] | ((prev: string[]) => string[])) => void
  resetOrder: (tableId: string, defaultOrder: string[]) => void
}

const EMPTY_ARRAY: string[] = []

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

export const useTableOrder = (tableId: string) =>
  useTableOrderStore((state) => state.tables[tableId] || EMPTY_ARRAY)

export const useSetOrderAction = () => useTableOrderStore((state) => state.setOrder)

export const useInitOrderAction = () => useTableOrderStore((state) => state.initOrder)

export const useResetOrderAction = () => useTableOrderStore((state) => state.resetOrder)
