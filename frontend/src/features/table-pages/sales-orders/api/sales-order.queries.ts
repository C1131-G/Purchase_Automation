/** Sales Order Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  salesOrderAPI,
  type SalesOrderListParams,
} from '@/features/table-pages/sales-orders/api/sales-order.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const salesOrderKeys = {
  all: ['sales-orders'] as const,
  list: (params: SalesOrderListParams) => [...salesOrderKeys.all, 'list', params] as const,
  detailByDocNum: (docNum: string) => [...salesOrderKeys.all, 'detail-by-doc-num', docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...salesOrderKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
  openLines: (cardCode: string) => [...salesOrderKeys.all, 'open-lines', cardCode] as const,
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
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: salesOrderKeys.docNumSuggestions(search, limit),
      queryFn: () => salesOrderAPI.getSalesOrderDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryKey: salesOrderKeys.detailByDocNum(docNum),
      queryFn: () => salesOrderAPI.getSalesOrderByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  openLines: (cardCode: string) =>
    queryOptions({
      queryKey: salesOrderKeys.openLines(cardCode),
      queryFn: () => salesOrderAPI.getOpenSalesOrderLines(cardCode),
      staleTime: 0, // Always fresh for transactional use
    }),
}
