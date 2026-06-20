import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { transferAPI } from "@/features/table-pages/transfer/api/transfer.service";
import type { TransferListParams } from "@/features/table-pages/transfer/api/transfer.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const transferKeys = {
  all: ["transfers"] as const,
  detailById: (id: string | number) => [...transferKeys.all, "detail", id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...transferKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: TransferListParams) => [...transferKeys.all, "list", params] as const,
};

export const transferQueries = {
  detailById: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => transferAPI.getTransferById(id),
      queryKey: transferKeys.detailById(id),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => transferAPI.getTransferDocNums(search, limit),
      queryKey: transferKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: TransferListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => transferAPI.getTransfers(params),
      queryKey: transferKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
