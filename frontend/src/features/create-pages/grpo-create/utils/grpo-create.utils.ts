import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'

export const GRPO_MANDATORY_FIELDS = [
  'vendorName',
  'vendorCode',
  'warehouseCode',
  'salesEmployee',
  'docDueDate',
  'billToAddress',
  'shipToAddress',
  'referenceNo',
  'comments',
] as const

export type GRPOMandatoryField = (typeof GRPO_MANDATORY_FIELDS)[number]

export const GRPO_FIELD_ERROR_TEXT: Record<GRPOMandatoryField, string> = {
  vendorName: 'Vendor Name is required.',
  vendorCode: 'Vendor Code is required.',
  warehouseCode: 'Warehouse is required.',
  salesEmployee: 'Buyer is required.',
  docDueDate: 'Delivery Date is required.',
  billToAddress: 'Bill To Address is required.',
  shipToAddress: 'Ship To Address is required.',
  referenceNo: 'Reference is required.',
  comments: 'Remarks is required.',
}

export const GRPO_FIELD_LABEL_TEXT: Record<GRPOMandatoryField, string> = {
  vendorName: 'Vendor Name',
  vendorCode: 'Vendor Code',
  warehouseCode: 'Warehouse',
  salesEmployee: 'Buyer',
  docDueDate: 'Delivery Date',
  billToAddress: 'Bill To Address',
  shipToAddress: 'Ship To Address',
  referenceNo: 'Reference',
  comments: 'Remarks',
}

export const getTodayISO = () => new Date().toISOString().slice(0, 10)

export const filterAndRankLookups = (items: LookupItem[], term: string) => {
  const normalized = term.trim().toLowerCase()
  if (!normalized) return items
  const score = (item: LookupItem) => {
    const code = item.code.toLowerCase()
    const name = item.name.toLowerCase()
    if (code === normalized || name === normalized) return 0
    if (code.startsWith(normalized) || name.startsWith(normalized)) return 1
    if (code.includes(normalized) || name.includes(normalized)) return 2
    return 3
  }
  return [...items]
    .filter((item) => {
      const code = item.code.toLowerCase()
      const name = item.name.toLowerCase()
      return code.includes(normalized) || name.includes(normalized)
    })
    .sort((a, b) => {
      const byScore = score(a) - score(b)
      if (byScore !== 0) return byScore
      return a.code.localeCompare(b.code, undefined, { sensitivity: 'base', numeric: true })
    })
}
