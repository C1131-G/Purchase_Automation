import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { transferRequestAPI } from "@/features/table-pages/transfer-request/api/transfer-request.service";
import type { TransferRequestListParams } from "@/features/table-pages/transfer-request/api/transfer-request.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const transferRequestKeys = {
  all: ["transferRequests"] as const,
  detailById: (id: string | number) => [...transferRequestKeys.all, "detail", id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...transferRequestKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: TransferRequestListParams) =>
    [...transferRequestKeys.all, "list", params] as const,
};

export const transferRequestQueries = {
  detailById: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => transferRequestAPI.getTransferRequestById(id),
      queryKey: transferRequestKeys.detailById(id),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => transferRequestAPI.getTransferRequestDocNums(search, limit),
      queryKey: transferRequestKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: TransferRequestListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => transferRequestAPI.getTransferRequests(params),
      queryKey: transferRequestKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
