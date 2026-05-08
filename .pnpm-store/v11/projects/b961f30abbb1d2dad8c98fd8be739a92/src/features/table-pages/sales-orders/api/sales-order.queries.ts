/** Sales Order Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { salesOrderAPI } from "@/features/table-pages/sales-orders/api/sales-order.service";
import type { SalesOrderListParams } from "@/features/table-pages/sales-orders/api/sales-order.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const salesOrderKeys = {
  all: ["sales-orders"] as const,
  detailByDocNum: (docNum: string) => [...salesOrderKeys.all, "detail-by-doc-num", docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...salesOrderKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: SalesOrderListParams) => [...salesOrderKeys.all, "list", params] as const,
  openLines: (cardCode: string) => [...salesOrderKeys.all, "open-lines", cardCode] as const,
};

export const salesOrderQueries = {
  detailByDocNum: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => salesOrderAPI.getSalesOrderByDocNum(docNum),
      queryKey: salesOrderKeys.detailByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => salesOrderAPI.getSalesOrderDocNums(search, limit),
      queryKey: salesOrderKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: SalesOrderListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => salesOrderAPI.getSalesOrders(params),
      queryKey: salesOrderKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  openLines: (cardCode: string) =>
    queryOptions({
      queryFn: () => salesOrderAPI.getOpenSalesOrderLines(cardCode),
      queryKey: salesOrderKeys.openLines(cardCode),
      staleTime: 0, // Always fresh for transactional use
    }),
};
