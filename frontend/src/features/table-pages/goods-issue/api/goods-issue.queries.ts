import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { goodsIssueAPI } from "@/features/table-pages/goods-issue/api/goods-issue.service";
import type { GoodsIssueListParams } from "@/features/table-pages/goods-issue/api/goods-issue.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const goodsIssueKeys = {
  all: ["goodsIssues"] as const,
  detailById: (id: string | number) => [...goodsIssueKeys.all, "detail", id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...goodsIssueKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: GoodsIssueListParams) => [...goodsIssueKeys.all, "list", params] as const,
};

export const goodsIssueQueries = {
  detailById: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => goodsIssueAPI.getGoodsIssueById(id),
      queryKey: goodsIssueKeys.detailById(id),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => goodsIssueAPI.getGoodsIssueDocNums(search, limit),
      queryKey: goodsIssueKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: GoodsIssueListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => goodsIssueAPI.getGoodsIssues(params),
      queryKey: goodsIssueKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
