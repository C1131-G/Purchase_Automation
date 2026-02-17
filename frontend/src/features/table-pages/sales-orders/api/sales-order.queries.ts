import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  salesOrderAPI,
  type SalesOrderListParams,
} from '@/features/table-pages/sales-orders/api/sales-order.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const salesOrderKeys = {
  all: ['sales-orders'] as const,
  list: (params: SalesOrderListParams) => [...salesOrderKeys.all, 'list', params] as const,
}

export const salesOrderQueries = {
  list: (params: SalesOrderListParams) =>
    queryOptions({
      queryKey: salesOrderKeys.list(params),
      queryFn: () => salesOrderAPI.getSalesOrders(params),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.list.staleTime,
      gcTime: QUERY_CACHE_POLICY.list.gcTime,
    }),
}
