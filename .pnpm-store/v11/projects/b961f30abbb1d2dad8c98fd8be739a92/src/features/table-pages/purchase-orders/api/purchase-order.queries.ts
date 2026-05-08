/** Purchase Order Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { purchaseOrderAPI } from "@/features/table-pages/purchase-orders/api/purchase-order.service";
import type { PurchaseOrderListParams } from "@/features/table-pages/purchase-orders/api/purchase-order.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const purchaseOrderKeys = {
  all: ["purchase-orders"] as const,
  detailByDocNum: (docNum: string) =>
    [...purchaseOrderKeys.all, "detail-by-doc-num", docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...purchaseOrderKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.all, "list", params] as const,
};

export const purchaseOrderQueries = {
  detailByDocNum: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => purchaseOrderAPI.getPurchaseOrderByDocNum(docNum),
      queryKey: purchaseOrderKeys.detailByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => purchaseOrderAPI.getPurchaseOrderDocNums(search, limit),
      queryKey: purchaseOrderKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: PurchaseOrderListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => purchaseOrderAPI.getPurchaseOrders(params),
      queryKey: purchaseOrderKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
