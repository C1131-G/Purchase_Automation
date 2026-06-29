/** Sales Quotation Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { salesQuotationAPI } from "@/features/table-pages/sales-quotations/api/sales-quotation.service";
import type { SalesQuotationListParams } from "@/features/table-pages/sales-quotations/api/sales-quotation.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const salesQuotationKeys = {
  all: ["sales-quotations"] as const,
  detailByDocNum: (docNum: string) =>
    [...salesQuotationKeys.all, "detail-by-doc-num", docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...salesQuotationKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: SalesQuotationListParams) => [...salesQuotationKeys.all, "list", params] as const,
};

export const salesQuotationQueries = {
  detailByDocNum: (docNum: string, draftDocEntry?: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => salesQuotationAPI.getSalesQuotationByDocNum(docNum, draftDocEntry),
      queryKey: [...salesQuotationKeys.detailByDocNum(docNum), draftDocEntry ?? ""] as const,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => salesQuotationAPI.getSalesQuotationDocNums(search, limit),
      queryKey: salesQuotationKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: SalesQuotationListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => salesQuotationAPI.getSalesQuotations(params),
      queryKey: salesQuotationKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  openLines: (cardCode: string) =>
    queryOptions({
      gcTime: 1000 * 60 * 5,
      queryFn: () => salesQuotationAPI.getOpenSalesQuotationLines(cardCode),
      queryKey: [...salesQuotationKeys.all, "open-lines", cardCode],
      staleTime: 0,
    }),
};
