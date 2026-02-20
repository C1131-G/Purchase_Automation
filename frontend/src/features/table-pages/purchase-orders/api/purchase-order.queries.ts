import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  purchaseOrderAPI,
  type PurchaseOrderListParams,
} from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string) =>
    [...purchaseOrderKeys.all, 'doc-num-suggestions', search ?? ''] as const,
}

export const purchaseOrderQueries = {
  list: (params: PurchaseOrderListParams) =>
    queryOptions({
      queryKey: purchaseOrderKeys.list(params),
      queryFn: () => purchaseOrderAPI.getPurchaseOrders(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string) =>
    queryOptions({
      queryKey: purchaseOrderKeys.docNumSuggestions(search),
      queryFn: () => purchaseOrderAPI.getPurchaseOrderDocNums(search),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
