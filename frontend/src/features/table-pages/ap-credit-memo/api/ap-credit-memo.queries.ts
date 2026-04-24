/** AP Credit Memo Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  apCreditMemoAPI,
  type APCreditMemoListParams,
} from '@/features/table-pages/ap-credit-memo/api/ap-credit-memo.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const apCreditMemoKeys = {
  all: ['ap-credit-memos'] as const,
  list: (params: APCreditMemoListParams) => [...apCreditMemoKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...apCreditMemoKeys.all, 'detail', id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...apCreditMemoKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
}

export const apCreditMemoQueries = {
  list: (params: APCreditMemoListParams) =>
    queryOptions({
      queryKey: apCreditMemoKeys.list(params),
      queryFn: () => apCreditMemoAPI.getAPCreditMemos(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryKey: apCreditMemoKeys.detail(docNum),
      queryFn: () => apCreditMemoAPI.getAPCreditMemo(docNum),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: apCreditMemoKeys.docNumSuggestions(search, limit),
      queryFn: () => apCreditMemoAPI.getAPCreditMemoDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
