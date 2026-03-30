/** GRPO Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { grpoAPI, type GRPOListParams } from '@/features/table-pages/grpo/api/grpo.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const grpoKeys = {
  all: ['grpos'] as const,
  list: (params: GRPOListParams) => [...grpoKeys.all, 'list', params] as const,
  detailByDocNum: (docNum: string) => [...grpoKeys.all, 'detail-by-doc-num', docNum] as const,
  detailById: (id: string | number) => [...grpoKeys.all, 'detail', id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...grpoKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
  availablePOs: (vendorCode: string) => [...grpoKeys.all, 'available-pos', vendorCode] as const,
  poDetail: (id: string | number) => [...grpoKeys.all, 'po-detail', id] as const,
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
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryKey: grpoKeys.detailByDocNum(docNum),
      queryFn: () => grpoAPI.getGRPOById(docNum),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
    }),
  detailById: (id: string | number) =>
    queryOptions({
      queryKey: grpoKeys.detailById(id),
      queryFn: () => grpoAPI.getGRPOById(id),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: grpoKeys.docNumSuggestions(search, limit),
      queryFn: () => grpoAPI.getGRPODocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  availablePOs: (vendorCode: string) =>
    queryOptions({
      queryKey: grpoKeys.availablePOs(vendorCode),
      queryFn: () => grpoAPI.getAvailablePOs(vendorCode),
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      placeholderData: keepPreviousData,
    }),
  poDetail: (id: string | number) =>
    queryOptions({
      queryKey: grpoKeys.poDetail(id),
      queryFn: () => grpoAPI.getPODetailForGRPO(id),
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
    }),
}
