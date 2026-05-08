/** AP Credit Memo Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { apCreditMemoAPI } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.service";
import type { APCreditMemoListParams } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const apCreditMemoKeys = {
  all: ["ap-credit-memos"] as const,
  detail: (id: string | number) => [...apCreditMemoKeys.all, "detail", id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...apCreditMemoKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: APCreditMemoListParams) => [...apCreditMemoKeys.all, "list", params] as const,
};

export const apCreditMemoQueries = {
  detailByDocNum: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => apCreditMemoAPI.getAPCreditMemo(docNum),
      queryKey: apCreditMemoKeys.detail(docNum),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => apCreditMemoAPI.getAPCreditMemoDocNums(search, limit),
      queryKey: apCreditMemoKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: APCreditMemoListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => apCreditMemoAPI.getAPCreditMemos(params),
      queryKey: apCreditMemoKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
