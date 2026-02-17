import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { grpoAPI, type GRPOListParams } from '@/features/table-pages/grpo/api/grpo.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const grpoKeys = {
  all: ['grpos'] as const,
  list: (params: GRPOListParams) => [...grpoKeys.all, 'list', params] as const,
}

export const grpoQueries = {
  list: (params: GRPOListParams) =>
    queryOptions({
      queryKey: grpoKeys.list(params),
      queryFn: () => grpoAPI.getGRPOs(params),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.list.staleTime,
      gcTime: QUERY_CACHE_POLICY.list.gcTime,
    }),
}
