export type ProductSearchFieldError = {
  vendorName: string | undefined
  vendorCode: string | undefined
  warehouse: string | undefined
  docDueDate: string | undefined
  salesEmployee: string | undefined
  billToAddress: string | undefined
  shipToAddress: string | undefined
  referenceNo: string | undefined
  comments: string | undefined
}

export const QUICK_PRODUCT_LIMIT = 50
export const FULL_PRODUCT_LIMIT = 200

export const EMPTY_PRODUCT_SEARCH_FIELD_ERRORS: ProductSearchFieldError = {
  vendorName: undefined,
  vendorCode: undefined,
  warehouse: undefined,
  docDueDate: undefined,
  salesEmployee: undefined,
  billToAddress: undefined,
  shipToAddress: undefined,
  referenceNo: undefined,
  comments: undefined,
}

export const MANDATORY_ERROR_TEXT = {
  vendorName: 'Customer Name is required.',
  vendorCode: 'Customer Code is required.',
  warehouseCode: 'Warehouse is required.',
  docDueDate: 'Document Due Date is required.',
  salesEmployee: 'Sales Employee is required.',
  billToAddress: 'Bill To Address is required.',
  shipToAddress: 'Ship To Address is required.',
  referenceNo: 'Reference No is required.',
  comments: 'Comments are required.',
}

export const REQUIRED_FIELD_LABEL_TEXT: Record<string, string> = {
  vendorName: 'Customer Name',
  vendorCode: 'Customer Code',
  warehouseCode: 'Warehouse',
  docDueDate: 'Document Due Date',
  salesEmployee: 'Sales Employee',
  billToAddress: 'Bill To Address',
  shipToAddress: 'Ship To Address',
  referenceNo: 'Reference No',
  comments: 'Comments',
}

export function rankProductsBySearchRelevance<T extends { code: string; name: string }>(
  products: T[],
  searchTerm: string,
): T[] {
  if (!searchTerm) return products
  const term = searchTerm.toLowerCase()
  return [...products].sort((a, b) => {
    const aLower = a.name.toLowerCase()
    const bLower = b.name.toLowerCase()
    const aCodeLower = a.code.toLowerCase()
    const bCodeLower = b.code.toLowerCase()

    if (aLower === term || aCodeLower === term) return -1
    if (bLower === term || bCodeLower === term) return 1

    const aStartsWith = aLower.startsWith(term) || aCodeLower.startsWith(term)
    const bStartsWith = bLower.startsWith(term) || bCodeLower.startsWith(term)
    if (aStartsWith && !bStartsWith) return -1
    if (bStartsWith && !aStartsWith) return 1

    return 0
  })
}
