import { create } from 'zustand'

export type SOLineItemState = {
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

export type SOHeaderState = {
  vendorCode: string
  vendorName: string
  docDate: string
  docDueDate: string
  warehouseCode: string
  referenceNo: string
  comments: string
}

type SOCreateState = {
  header: SOHeaderState
  lines: SOLineItemState[]
  setHeader: (patch: Partial<SOHeaderState>) => void
  addLine: (line: SOLineItemState) => void
  updateLine: (id: string, patch: Partial<SOLineItemState>) => void
  removeLine: (id: string) => void
  reset: () => void
}

const getToday = () => new Date().toISOString().slice(0, 10)

const getDefaultHeader = (): SOHeaderState => ({
  vendorCode: '',
  vendorName: '',
  docDate: getToday(),
  docDueDate: '',
  warehouseCode: '',
  referenceNo: '',
  comments: '',
})

export const useSOCreateStore = create<SOCreateState>((set) => ({
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

export const useSOHeader = () => useSOCreateStore((state) => state.header)

export const useSetSOHeaderAction = () => useSOCreateStore((state) => state.setHeader)
export const useResetSOCreateAction = () => useSOCreateStore((state) => state.reset)
