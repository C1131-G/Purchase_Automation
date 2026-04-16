import { create } from 'zustand'

import { type ProductRow } from '@/features/create-pages/create-shared/utils/create-order.types'

export type APCreditMemoLineItemState = ProductRow & {
  baseQuantity?: number | undefined
}

export type APCreditMemoHeaderState = {
  vendorCode: string
  vendorName: string
  docDate: string
  docDueDate: string
  warehouseCode: string
  referenceNo: string
  remarks: string
  referenceAutoFilled: boolean
}

type APCreditMemoCreateState = {
  header: APCreditMemoHeaderState
  lines: APCreditMemoLineItemState[]
  setHeader: (patch: Partial<APCreditMemoHeaderState>) => void
  setLines: (
    lines:
      | APCreditMemoLineItemState[]
      | ((prev: APCreditMemoLineItemState[]) => APCreditMemoLineItemState[]),
  ) => void
  addLine: (line: APCreditMemoLineItemState) => void
  updateLine: (id: string, patch: Partial<APCreditMemoLineItemState>) => void
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
  base.setMonth(base.getMonth() + 1)
  base.setDate(base.getDate() + 2)
  return toISODate(base)
}

const getDefaultHeader = (): APCreditMemoHeaderState => ({
  vendorCode: '',
  vendorName: '',
  docDate: getToday(),
  docDueDate: getAutoDocDueDate(getToday()),
  warehouseCode: '',
  referenceNo: '',
  remarks: '',
  referenceAutoFilled: false,
})

export const useAPCreditMemoCreateStore = create<APCreditMemoCreateState>((set) => ({
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

export const useAPCreditMemoHeader = () => useAPCreditMemoCreateStore((state) => state.header)
export const useAPCreditMemoLines = () => useAPCreditMemoCreateStore((state) => state.lines)
export const useSetAPCreditMemoHeaderAction = () =>
  useAPCreditMemoCreateStore((state) => state.setHeader)
export const useSetAPCreditMemoLinesAction = () =>
  useAPCreditMemoCreateStore((state) => state.setLines)
export const useResetAPCreditMemoCreateAction = () =>
  useAPCreditMemoCreateStore((state) => state.reset)
