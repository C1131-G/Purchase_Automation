/** Purchase Quotation Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { purchaseQuotationAPI } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.service";
import type { PurchaseQuotationListParams } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const purchaseQuotationKeys = {
  all: ["purchase-quotations"] as const,
  detailByDocNum: (docNum: string) =>
    [...purchaseQuotationKeys.all, "detail-by-doc-num", docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...purchaseQuotationKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: PurchaseQuotationListParams) =>
    [...purchaseQuotationKeys.all, "list", params] as const,
};

export const purchaseQuotationQueries = {
  detailByDocNum: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => purchaseQuotationAPI.getPurchaseQuotationByDocNum(docNum),
      queryKey: purchaseQuotationKeys.detailByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => purchaseQuotationAPI.getPurchaseQuotationDocNums(search, limit),
      queryKey: purchaseQuotationKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: PurchaseQuotationListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => purchaseQuotationAPI.getPurchaseQuotations(params),
      queryKey: purchaseQuotationKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  openLines: (cardCode: string) =>
    queryOptions({
      gcTime: 1000 * 60 * 5,
      queryFn: () => purchaseQuotationAPI.getOpenPurchaseQuotationLines(cardCode),
      queryKey: [...purchaseQuotationKeys.all, "open-lines", cardCode],
      staleTime: 0,
    }),
};
