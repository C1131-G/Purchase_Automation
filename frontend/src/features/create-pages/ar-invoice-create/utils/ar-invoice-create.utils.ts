import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { SALES_ORDER_MANDATORY_FIELDS } from '@/features/create-pages/create-shared/config/create-mandatory-fields'

export type ProductSearchFieldError = {
  vendorName: string | undefined
  vendorCode: string | undefined
  docDueDate: string | undefined
  warehouseCode: string | undefined
  salesEmployee: string | undefined
  billToAddress: string | undefined
  shipToAddress: string | undefined
  referenceNo: string | undefined
  comments: string | undefined
}

export const EMPTY_PRODUCT_SEARCH_FIELD_ERRORS: ProductSearchFieldError = {
  vendorName: undefined,
  vendorCode: undefined,
  docDueDate: undefined,
  warehouseCode: undefined,
  salesEmployee: undefined,
  billToAddress: undefined,
  shipToAddress: undefined,
  referenceNo: undefined,
  comments: undefined,
}

export const MANDATORY_ERROR_TEXT: Record<(typeof SALES_ORDER_MANDATORY_FIELDS)[number], string> = {
  vendorCode: 'Customer Code is required.',
  vendorName: 'Customer Name is required.',
  warehouseCode: 'Warehouse is required.',
  referenceNo: 'Reference is required.',
  comments: 'Remarks is required.',
}

export const REQUIRED_FIELD_LABEL_TEXT: Record<
  (typeof SALES_ORDER_MANDATORY_FIELDS)[number],
  string
> = {
  vendorCode: 'Customer Code',
  vendorName: 'Customer Name',
  warehouseCode: 'Warehouse',
  referenceNo: 'Reference',
  comments: 'Remarks',
}

export const QUICK_PRODUCT_LIMIT = 10
export const FULL_PRODUCT_LIMIT = 100

export const rankProductsBySearchRelevance = (items: ProductLookupItem[], rawSearch: string) => {
  const term = rawSearch.trim().toLowerCase()
  if (!term) return items

  const score = (item: ProductLookupItem) => {
    const code = item.code.toLowerCase()
    const name = item.name.toLowerCase()
    if (code === term || name === term) return 0
    if (code.startsWith(term) || name.startsWith(term)) return 1
    if (code.includes(term) || name.includes(term)) return 2
    return 3
  }

  return [...items].sort((a, b) => {
    const byScore = score(a) - score(b)
    if (byScore !== 0) return byScore
    return a.code.localeCompare(b.code, undefined, { sensitivity: 'base', numeric: true })
  })
}
