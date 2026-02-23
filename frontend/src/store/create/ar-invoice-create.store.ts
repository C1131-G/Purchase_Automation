import { create } from 'zustand'

export type ARInvoiceLineItemState = {
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

export type ARInvoiceHeaderState = {
  vendorCode: string
  vendorName: string
  docDate: string
  docDueDate: string
  warehouseCode: string
  referenceNo: string
  comments: string
}

type ARInvoiceCreateState = {
  header: ARInvoiceHeaderState
  lines: ARInvoiceLineItemState[]
  setHeader: (patch: Partial<ARInvoiceHeaderState>) => void
  addLine: (line: ARInvoiceLineItemState) => void
  updateLine: (id: string, patch: Partial<ARInvoiceLineItemState>) => void
  removeLine: (id: string) => void
  reset: () => void
}

const getToday = () => new Date().toISOString().slice(0, 10)

const getDefaultHeader = (): ARInvoiceHeaderState => ({
  vendorCode: '',
  vendorName: '',
  docDate: getToday(),
  docDueDate: '',
  warehouseCode: '',
  referenceNo: '',
  comments: '',
})

export const useARInvoiceCreateStore = create<ARInvoiceCreateState>((set) => ({
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

export const useARInvoiceHeader = () => useARInvoiceCreateStore((state) => state.header)
export const useSetARInvoiceHeaderAction = () => useARInvoiceCreateStore((state) => state.setHeader)
export const useResetARInvoiceCreateAction = () => useARInvoiceCreateStore((state) => state.reset)
