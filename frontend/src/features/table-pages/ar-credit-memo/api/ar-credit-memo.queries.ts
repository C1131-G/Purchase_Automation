/** AR Credit Memo Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  ArCreditMemoAPI,
  type ArCreditMemoListParams,
} from '@/features/table-pages/ar-credit-memo/api/ar-credit-memo.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const ArCreditMemoKeys = {
  all: ['ar-credit-memos'] as const,
  list: (params: ArCreditMemoListParams) => [...ArCreditMemoKeys.all, 'list', params] as const,
  detailByDocNum: (docNum: string) =>
    [...ArCreditMemoKeys.all, 'detail-by-doc-num', docNum] as const,
  detailById: (id: string | number) => [...ArCreditMemoKeys.all, 'detail', id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...ArCreditMemoKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
}

export const arCreditMemoQueries = {
  list: (params: ArCreditMemoListParams) =>
    queryOptions({
      queryKey: ArCreditMemoKeys.list(params),
      queryFn: () => ArCreditMemoAPI.getArCreditMemos(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryKey: ArCreditMemoKeys.detailByDocNum(docNum),
      queryFn: async () => {
        const list = await ArCreditMemoAPI.getArCreditMemos({
          page: 1,
          limit: 10,
          DocNum: String(docNum).trim(),
        })
        const exact = (list.data ?? []).find((item) => String(item.DocNum).trim() === docNum.trim())
        const fallback = list.data?.[0]
        const target = exact ?? fallback
        if (!target?.id && target?.id !== 0) {
          throw new Error('A/R credit memo not found')
        }
        return ArCreditMemoAPI.getArCreditMemoById(target.id)
      },
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  detailById: (id: string | number) =>
    queryOptions({
      queryKey: ArCreditMemoKeys.detailById(id),
      queryFn: () => ArCreditMemoAPI.getArCreditMemoById(id),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: ArCreditMemoKeys.docNumSuggestions(search, limit),
      queryFn: () => ArCreditMemoAPI.getArCreditMemoDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
