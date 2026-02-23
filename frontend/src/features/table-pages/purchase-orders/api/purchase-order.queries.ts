/** Purchase Order Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  purchaseOrderAPI,
  type PurchaseOrderListParams,
} from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.all, 'list', params] as const,
  detailByDocNum: (docNum: string) =>
    [...purchaseOrderKeys.all, 'detail-by-doc-num', docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...purchaseOrderKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
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
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: purchaseOrderKeys.docNumSuggestions(search, limit),
      queryFn: () => purchaseOrderAPI.getPurchaseOrderDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryKey: purchaseOrderKeys.detailByDocNum(docNum),
      queryFn: () => purchaseOrderAPI.getPurchaseOrderByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
