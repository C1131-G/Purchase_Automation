import { type ColumnFiltersState } from '@tanstack/react-table'

import { normalizeColumnFilters } from '@/components/types/filter-utils'
import {
  type SalesOrderListParams,
  type SalesOrderStatus,
} from '@/features/table-pages/sales-orders/api/sales-order.service'
import { type SalesOrderSearch } from '@/features/table-pages/sales-orders/schemas/sales-order-search.schema'
import {
  type DateRangeFilter,
  isDateRangeFilter,
  isNumberComparisonFilter,
} from '@/features/table-pages/shared/utils/table-filter-values'
import { type ComparisonOperator } from '@/shared/api/common-query.types'

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
): { operator: ComparisonOperator; value: number } | undefined => {
  const value = findFilter(filters, id)?.value
  if (!isNumberComparisonFilter(value)) return undefined
  return { operator: value.operator, value: value.value }
}

const SORTABLE_FIELDS = new Set([
  'DocNum',
  'DocDate',
  'CardCode',
  'CardName',
  'DocTotal',
  'DocStatus',
])

export const mapSearchToSalesOrderListParams = (search: SalesOrderSearch): SalesOrderListParams => {
  const filters = normalizeColumnFilters(search.columnFilters)

  const docDate = getDateRangeFilter(filters, 'DocDate')
  const docStatus = getEnumFilter<SalesOrderStatus>(filters, 'DocStatus', ['Open', 'Closed'])
  const docTotal = getNumberComparison(filters, 'DocTotal')

  const start = docDate?.from ?? docDate?.to
  const end = docDate?.to ?? docDate?.from

  const firstSort = Array.isArray(search.sorting) ? search.sorting[0] : undefined
  const sortBy =
    firstSort && SORTABLE_FIELDS.has(firstSort.id)
      ? (firstSort.id as SalesOrderListParams['sortBy'])
      : undefined
  const sortOrder = firstSort ? (firstSort.desc ? 'desc' : 'asc') : undefined

  return {
    page: Math.max(search.page ?? 1, 1),
    limit: Math.max(search.limit ?? 10, 1),
    DocNum: getStringFilter(filters, 'DocNum'),
    CardCode: getStringFilter(filters, 'CardCode'),
    CardName: getStringFilter(filters, 'CardName'),
    DocStatus: docStatus,
    DocDateStart: start,
    DocDateEnd: end,
    DocTotalOperator: docTotal?.operator,
    DocTotal: docTotal?.value,
    sortBy,
    sortOrder,
  }
}
