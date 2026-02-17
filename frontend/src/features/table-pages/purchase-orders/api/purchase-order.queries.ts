import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  purchaseOrderAPI,
  type PurchaseOrderListParams,
} from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.all, 'list', params] as const,
}

export const purchaseOrderQueries = {
  list: (params: PurchaseOrderListParams) =>
    queryOptions({
      queryKey: purchaseOrderKeys.list(params),
      queryFn: () => purchaseOrderAPI.getPurchaseOrders(params),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.list.staleTime,
      gcTime: QUERY_CACHE_POLICY.list.gcTime,
    }),
}
