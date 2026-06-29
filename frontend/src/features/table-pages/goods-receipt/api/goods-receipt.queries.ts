import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { goodsReceiptAPI } from "@/features/table-pages/goods-receipt/api/goods-receipt.service";
import type { GoodsReceiptListParams } from "@/features/table-pages/goods-receipt/api/goods-receipt.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const goodsReceiptKeys = {
  all: ["goodsReceipts"] as const,
  detailById: (id: string | number) => [...goodsReceiptKeys.all, "detail", id] as const,
  list: (params: GoodsReceiptListParams) => [...goodsReceiptKeys.all, "list", params] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...goodsReceiptKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
};

export const goodsReceiptQueries = {
  detailById: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => goodsReceiptAPI.getGoodsReceiptById(id),
      queryKey: goodsReceiptKeys.detailById(id),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  list: (params: GoodsReceiptListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => goodsReceiptAPI.getGoodsReceipts(params),
      queryKey: goodsReceiptKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => goodsReceiptAPI.getGoodsReceiptDocNums(search, limit),
      queryKey: goodsReceiptKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateGoodsReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string | number;
      payload: { Comments?: string; JrnlMemo?: string; Ref2?: string; Attachments?: any[] };
    }) => goodsReceiptAPI.updateGoodsReceipt(data.id, data.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.all });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detailById(variables.id) });
    },
  });
}
