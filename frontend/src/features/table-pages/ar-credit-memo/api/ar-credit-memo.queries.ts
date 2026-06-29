/** AR Credit Memo Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { ArCreditMemoAPI } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.service";
import type { ArCreditMemoListParams } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const ArCreditMemoKeys = {
  all: ["ar-credit-memos"] as const,
  detailByDocNum: (docNum: string, draftDocEntry?: string | number) =>
    [...ArCreditMemoKeys.all, "detail-by-doc-num", docNum, draftDocEntry ?? ""] as const,
  detailById: (id: string | number, draftDocEntry?: string | number) =>
    [...ArCreditMemoKeys.all, "detail", id, draftDocEntry ?? ""] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...ArCreditMemoKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: ArCreditMemoListParams) => [...ArCreditMemoKeys.all, "list", params] as const,
};

export const arCreditMemoQueries = {
  detailByDocNum: (docNum: string, draftDocEntry?: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: async () => {
        if (draftDocEntry) {
          return ArCreditMemoAPI.getArCreditMemoById(String(draftDocEntry), draftDocEntry);
        }
        const list = await ArCreditMemoAPI.getArCreditMemos({
          page: 1,
          limit: 10,
          DocNum: String(docNum).trim(),
        });
        const exact = (list.data ?? []).find(
          (item) => String(item.DocNum).trim() === docNum.trim(),
        );
        const fallback = list.data?.[0];
        const target = exact ?? fallback;
        if (!target?.id && target?.id !== 0) {
          throw new Error("A/R credit memo not found");
        }
        return ArCreditMemoAPI.getArCreditMemoById(target.id);
      },
      queryKey: ArCreditMemoKeys.detailByDocNum(docNum, draftDocEntry),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  detailById: (id: string | number, draftDocEntry?: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => ArCreditMemoAPI.getArCreditMemoById(id, draftDocEntry),
      queryKey: ArCreditMemoKeys.detailById(id, draftDocEntry),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => ArCreditMemoAPI.getArCreditMemoDocNums(search, limit),
      queryKey: ArCreditMemoKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: ArCreditMemoListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => ArCreditMemoAPI.getArCreditMemos(params),
      queryKey: ArCreditMemoKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
