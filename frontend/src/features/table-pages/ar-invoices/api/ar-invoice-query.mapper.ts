import { type ColumnFiltersState } from '@tanstack/react-table'

import { normalizeColumnFilters } from '@/components/types/filter-utils'
import {
  type ARInvoiceListParams,
  type ARInvoiceStatus,
} from '@/features/table-pages/ar-invoices/api/ar-invoice.service'
import { type ARInvoiceSearch } from '@/features/table-pages/ar-invoices/schemas/ar-invoice-search.schema'
import {
  type DateRangeFilter,
  isDateRangeFilter,
} from '@/features/table-pages/shared/utils/table-filter-values'

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

const getNumberComparison = (
  filters: ColumnFiltersState,
  id: string,
): { operator: 'eq' | 'lt' | 'gt'; value: number } | undefined => {
  const value = findFilter(filters, id)?.value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const candidate = value as { operator?: string; value?: number | string }
  const operator = candidate.operator
  const parsed =
    typeof candidate.value === 'number'
      ? candidate.value
      : parseFloat(String(candidate.value ?? ''))

  if (operator !== 'eq' && operator !== 'lt' && operator !== 'gt') return undefined
  if (!Number.isFinite(parsed)) return undefined
  return { operator, value: parsed }
}

const SORTABLE_FIELDS = new Set([
  'DocNum',
  'DocDate',
  'CardCode',
  'CardName',
  'DocTotal',
  'NumAtCard',
  'DocStatus',
])

export const mapSearchToARInvoiceListParams = (search: ARInvoiceSearch): ARInvoiceListParams => {
  const filters = normalizeColumnFilters(search.columnFilters)

  const docDate = getDateRangeFilter(filters, 'DocDate')
  const docStatus = getEnumFilter<ARInvoiceStatus>(filters, 'DocStatus', ['Open', 'Closed'])
  const docTotal = getNumberComparison(filters, 'DocTotal')
  const numAtCard = getStringFilter(filters, 'NumAtCard')

  const start = docDate?.from ?? docDate?.to
  const end = docDate?.to ?? docDate?.from

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as ARInvoiceListParams['sortBy'])
      : undefined
  const sortOrder = firstSort ? (firstSort.desc ? 'desc' : 'asc') : undefined

  const params: ARInvoiceListParams = {
    page: Math.max(search.page ?? 1, 1),
    limit: Math.max(search.limit ?? 10, 1),
  }

  const docNum = getStringFilter(filters, 'DocNum')
  if (docNum) params.DocNum = docNum

  const cardCode = getStringFilter(filters, 'CardCode')
  if (cardCode) params.CardCode = cardCode

  const cardName = getStringFilter(filters, 'CardName')
  if (cardName) params.CardName = cardName

  if (numAtCard) params.NumAtCard = numAtCard
  if (docStatus) params.DocStatus = docStatus
  if (start) params.DocDateStart = start
  if (end) params.DocDateEnd = end
  if (docTotal?.operator) params.DocTotalOperator = docTotal.operator
  if (docTotal?.value !== undefined) params.DocTotal = docTotal.value
  if (sortBy) params.sortBy = sortBy
  if (sortOrder) params.sortOrder = sortOrder

  return params
}
