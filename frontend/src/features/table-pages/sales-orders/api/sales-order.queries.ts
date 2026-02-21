import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  salesOrderAPI,
  type SalesOrderListParams,
} from '@/features/table-pages/sales-orders/api/sales-order.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const salesOrderKeys = {
  all: ['sales-orders'] as const,
  list: (params: SalesOrderListParams) => [...salesOrderKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string) =>
    [...salesOrderKeys.all, 'doc-num-suggestions', search ?? ''] as const,
}

export const salesOrderQueries = {
  list: (params: SalesOrderListParams) =>
    queryOptions({
      queryKey: salesOrderKeys.list(params),
      queryFn: () => salesOrderAPI.getSalesOrders(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string) =>
    queryOptions({
      queryKey: salesOrderKeys.docNumSuggestions(search),
      queryFn: () => salesOrderAPI.getSalesOrderDocNums(search),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
