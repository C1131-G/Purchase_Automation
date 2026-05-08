/** GRPO Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { grpoAPI } from "@/features/table-pages/grpo/api/grpo.service";
import type { GRPOListParams } from "@/features/table-pages/grpo/api/grpo.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const grpoKeys = {
  all: ["grpos"] as const,
  availablePOs: (vendorCode: string) => [...grpoKeys.all, "available-pos", vendorCode] as const,
  detailByDocNum: (docNum: string) => [...grpoKeys.all, "detail-by-doc-num", docNum] as const,
  detailById: (id: string | number) => [...grpoKeys.all, "detail", id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...grpoKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: GRPOListParams) => [...grpoKeys.all, "list", params] as const,
  poDetail: (id: string | number) => [...grpoKeys.all, "po-detail", id] as const,
};

export const grpoQueries = {
  availablePOs: (vendorCode: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => grpoAPI.getAvailablePOs(vendorCode),
      queryKey: grpoKeys.availablePOs(vendorCode),
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    }),
  detailByDocNum: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => grpoAPI.getGRPOById(docNum),
      queryKey: grpoKeys.detailByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  detailById: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => grpoAPI.getGRPOById(id),
      queryKey: grpoKeys.detailById(id),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => grpoAPI.getGRPODocNums(search, limit),
      queryKey: grpoKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: GRPOListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => grpoAPI.getGRPOs(params),
      queryKey: grpoKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  poDetail: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      queryFn: () => grpoAPI.getPODetailForGRPO(id),
      queryKey: grpoKeys.poDetail(id),
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    }),
};
