import { type ColumnFiltersState } from '@tanstack/react-table'

import { normalizeColumnFilters } from '@/components/ui/types/filter-utils'
import {
  type DateRangeFilter,
  isDateRangeFilter,
  isNumberComparisonFilter,
  type NumberComparisonFilter,
} from '@/components/ui/types/table-filter-values'
import {
  type PurchaseOrderListParams,
  type PurchaseOrderStatus,
} from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import { type PurchaseOrderSearch } from '@/features/table-pages/purchase-orders/schemas/purchase-order-search.schema'

const findFilter = (filters: ColumnFiltersState, id: string) => filters.find((f) => f.id === id)

const getStringFilter = (filters: ColumnFiltersState, id: string): string | undefined => {
  const value = findFilter(filters, id)?.value
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const getEnumFilter = <T extends string>(
  filters: ColumnFiltersState,
  id: string,
  allowed: readonly T[],
): T | undefined => {
  const value = findFilter(filters, id)?.value
  if (typeof value !== 'string') return undefined
  return allowed.includes(value as T) ? (value as T) : undefined
}

const getDateRangeFilter = (
  filters: ColumnFiltersState,
  id: string,
): DateRangeFilter | undefined => {
  const value = findFilter(filters, id)?.value
  if (!isDateRangeFilter(value)) return undefined
  if (!value.from && !value.to) return undefined
  if (value.from && value.to && value.from > value.to) {
    return { from: value.to, to: value.from }
  }
  return value
}

const getDocTotalFilter = (filters: ColumnFiltersState): NumberComparisonFilter | undefined => {
  const value = findFilter(filters, 'DocTotal')?.value
  if (!isNumberComparisonFilter(value)) return undefined
  return {
    operator: value.operator,
    value: value.value,
  }
}

const SORTABLE_FIELDS = new Set([
  'DocNum',
  'DocDate',
  'CardCode',
  'CardName',
  'DocTotal',
  'DocStatus',
])

export const mapSearchToPurchaseOrderListParams = (
  search: PurchaseOrderSearch,
): PurchaseOrderListParams => {
  const filters = normalizeColumnFilters(search.columnFilters)

  const docDate = getDateRangeFilter(filters, 'DocDate')
  const docTotal = getDocTotalFilter(filters)
  const docStatus = getEnumFilter<PurchaseOrderStatus>(filters, 'DocStatus', ['Open', 'Closed'])

  // For date single-pick semantics, one boundary means exact day.
  const start = docDate?.from ?? docDate?.to
  const end = docDate?.to ?? docDate?.from

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as PurchaseOrderListParams['sortBy'])
      : undefined
  const sortOrder = firstSort ? (firstSort.desc ? 'desc' : 'asc') : undefined

  const params: PurchaseOrderListParams = {
    page: Math.max(search.page ?? 1, 1),
    limit: Math.max(search.limit ?? 10, 1),
  }

  const docNum = getStringFilter(filters, 'DocNum')
  if (docNum) params.DocNum = docNum

  const cardCode = getStringFilter(filters, 'CardCode')
  if (cardCode) params.CardCode = cardCode

  const cardName = getStringFilter(filters, 'CardName')
  if (cardName) params.CardName = cardName

  if (docStatus) params.DocStatus = docStatus
  if (start) params.DocDateStart = start
  if (end) params.DocDateEnd = end
  if (docTotal?.operator) params.DocTotalOperator = docTotal.operator
  if (docTotal?.value !== undefined) params.DocTotal = docTotal.value
  if (sortBy) params.sortBy = sortBy
  if (sortOrder) params.sortOrder = sortOrder

  return params
}
