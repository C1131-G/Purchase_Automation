import { create } from 'zustand'

/** POLineItemState: Local state representation of a single document line. */
export type POLineItemState = {
  id: string
  itemCode: string
  itemName: string
  quantity: number
  unitPrice: number
  taxCode: string
  taxRate: number
  warehouseCode: string
  discountPercent: number
  productCode: string
  productName: string
  price: number
  currency: string
  stock: number
  discountAmount: number
  comment: string
}

/** POHeaderState: Top-level document metadata (Vendor, Dates, Warehouse). */
export type POHeaderState = {
  vendorCode: string
  vendorName: string
  docDate: string
  docDueDate: string
  warehouseCode: string
  referenceNo: string
  comments: string
}

/** POCreateState: Orchestrates the draft PO state and mutation actions. */
type POCreateState = {
  header: POHeaderState
  lines: POLineItemState[]
  setHeader: (patch: Partial<POHeaderState>) => void
  addLine: (line: POLineItemState) => void
  updateLine: (id: string, patch: Partial<POLineItemState>) => void
  removeLine: (id: string) => void
  reset: () => void
}

const getToday = () => new Date().toISOString().slice(0, 10)

const getDefaultHeader = (): POHeaderState => ({
  vendorCode: '',
  vendorName: '',
  docDate: getToday(),
  docDueDate: '',
  warehouseCode: '',
  referenceNo: '',
  comments: '',
})

/**
 * usePOCreateStore: Global store for managing the creation lifecycle of Purchase Orders.
 * Centralizes header data and line items before persistence.
 */
export const usePOCreateStore = create<POCreateState>((set) => ({
  header: getDefaultHeader(),
  lines: [],
  setHeader: (patch) =>
    set((prev) => ({
      ...prev,
      header: { ...prev.header, ...patch },
    })),
  addLine: (line) =>
    set((prev) => ({
      ...prev,
      lines: [...prev.lines, line],
    })),
  updateLine: (id, patch) =>
    set((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    })),
  removeLine: (id) =>
    set((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== id),
    })),
  reset: () =>
    set({
      header: getDefaultHeader(),
      lines: [],
    }),
}))

export const usePOHeader = () => usePOCreateStore((state) => state.header)

export const useSetPOHeaderAction = () => usePOCreateStore((state) => state.setHeader)
export const useResetPOCreateAction = () => usePOCreateStore((state) => state.reset)
