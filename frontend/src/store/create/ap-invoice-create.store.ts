import { create } from 'zustand'
import { type ProductRow } from '@/features/create-pages/create-shared/utils/create-order.types'

export type APInvoiceLineItemState = ProductRow & {
  baseQuantity?: number | undefined
}

export type APInvoiceHeaderState = {
  vendorCode: string
  vendorName: string
  docDate: string
  docDueDate: string
  warehouseCode: string
  referenceNo: string
  remarks: string
}

type APInvoiceCreateState = {
  header: APInvoiceHeaderState
  lines: APInvoiceLineItemState[]
  setHeader: (patch: Partial<APInvoiceHeaderState>) => void
  setLines: (
    lines: APInvoiceLineItemState[] | ((prev: APInvoiceLineItemState[]) => APInvoiceLineItemState[]),
  ) => void
  addLine: (line: APInvoiceLineItemState) => void
  updateLine: (id: string, patch: Partial<APInvoiceLineItemState>) => void
  removeLine: (id: string) => void
  reset: () => void
}

const getToday = () => new Date().toISOString().slice(0, 10)
const toISODate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const getAutoDocDueDate = (docDate: string) => {
  if (!docDate) return ''
  const base = new Date(`${docDate}T00:00:00`)
  if (Number.isNaN(base.getTime())) return ''
  // 32-day offset for invoices as seen in other invoice logic
  base.setMonth(base.getMonth() + 1)
  base.setDate(base.getDate() + 2)
  return toISODate(base)
}

const getDefaultHeader = (): APInvoiceHeaderState => ({
  vendorCode: '',
  vendorName: '',
  docDate: getToday(),
  docDueDate: getAutoDocDueDate(getToday()),
  warehouseCode: '',
  referenceNo: '',
  remarks: '',
})

export const useAPInvoiceCreateStore = create<APInvoiceCreateState>((set) => ({
  header: getDefaultHeader(),
  lines: [],
  setHeader: (patch) =>
    set((prev) => {
      const nextHeader = { ...prev.header, ...patch }
      if (patch.docDate !== undefined && patch.docDueDate === undefined) {
        nextHeader.docDueDate = getAutoDocDueDate(String(patch.docDate))
      }
      return {
        ...prev,
        header: nextHeader,
      }
    }),
  setLines: (lines) =>
    set((prev) => ({
      ...prev,
      lines: typeof lines === 'function' ? lines(prev.lines) : lines,
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

export const useAPInvoiceHeader = () => useAPInvoiceCreateStore((state) => state.header)
export const useAPInvoiceLines = () => useAPInvoiceCreateStore((state) => state.lines)
export const useSetAPInvoiceHeaderAction = () => useAPInvoiceCreateStore((state) => state.setHeader)
export const useSetAPInvoiceLinesAction = () => useAPInvoiceCreateStore((state) => state.setLines)
export const useResetAPInvoiceCreateAction = () => useAPInvoiceCreateStore((state) => state.reset)
