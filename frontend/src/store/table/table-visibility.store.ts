import { create } from 'zustand'

interface VisibilityStore {
  tables: Record<string, Record<string, boolean>>
  initVisibility: (tableId: string, visibility: Record<string, boolean>) => void
  setVisibility: (
    tableId: string,
    visibility:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void
  resetVisibility: (tableId: string) => void
}

const EMPTY_OBJECT: Record<string, boolean> = {}

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

export const useTableVisibility = (tableId: string) =>
  useTableVisibilityStore((state) => state.tables[tableId] || EMPTY_OBJECT)

export const useSetVisibilityAction = () => useTableVisibilityStore((state) => state.setVisibility)

export const useInitVisibilityAction = () =>
  useTableVisibilityStore((state) => state.initVisibility)

export const useResetVisibilityAction = () =>
  useTableVisibilityStore((state) => state.resetVisibility)
