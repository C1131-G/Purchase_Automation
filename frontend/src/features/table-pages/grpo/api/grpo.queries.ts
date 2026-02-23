/** GRPO Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { grpoAPI, type GRPOListParams } from '@/features/table-pages/grpo/api/grpo.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const grpoKeys = {
  all: ['grpos'] as const,
  list: (params: GRPOListParams) => [...grpoKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...grpoKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
}

export const grpoQueries = {
  list: (params: GRPOListParams) =>
    queryOptions({
      queryKey: grpoKeys.list(params),
      queryFn: () => grpoAPI.getGRPOs(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: grpoKeys.docNumSuggestions(search, limit),
      queryFn: () => grpoAPI.getGRPODocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
