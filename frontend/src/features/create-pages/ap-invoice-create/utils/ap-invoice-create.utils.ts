import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'

export const AP_INVOICE_MANDATORY_FIELDS = [
  'vendorName',
  'vendorCode',
  'warehouseCode',
  'referenceNo',
  'comments',
] as const

export type APInvoiceMandatoryField = (typeof AP_INVOICE_MANDATORY_FIELDS)[number]

export const AP_INVOICE_FIELD_ERROR_TEXT: Record<APInvoiceMandatoryField, string> = {
  vendorName: 'Vendor Name is required.',
  vendorCode: 'Vendor Code is required.',
  warehouseCode: 'Warehouse is required.',
  referenceNo: 'Reference is required.',
  comments: 'Remarks is required.',
}

export const AP_INVOICE_FIELD_LABEL_TEXT: Record<APInvoiceMandatoryField, string> = {
  vendorName: 'Vendor Name',
  vendorCode: 'Vendor Code',
  warehouseCode: 'Warehouse',
  referenceNo: 'Reference',
  comments: 'Remarks',
}

export const getTodayISO = () => new Date().toISOString().slice(0, 10)

export const filterAndRankLookups = <T extends LookupItem>(items: T[], term: string): T[] => {
  const normalized = term.trim().toLowerCase()
  if (!normalized) return items
  const score = (item: T) => {
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
