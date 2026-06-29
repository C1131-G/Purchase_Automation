/** AP Invoice Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { apInvoiceAPI } from "@/features/table-pages/ap-invoices/api/ap-invoice.service";
import type { APInvoiceListParams } from "@/features/table-pages/ap-invoices/api/ap-invoice.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const apInvoiceKeys = {
  all: ["ap-invoices"] as const,
  detail: (id: string | number, draftDocEntry?: string) =>
    [...apInvoiceKeys.all, "detail", id, draftDocEntry ?? ""] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...apInvoiceKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: APInvoiceListParams) => [...apInvoiceKeys.all, "list", params] as const,
};

export const apInvoiceQueries = {
  detailByDocNum: (docNum: string, draftDocEntry?: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => apInvoiceAPI.getAPInvoice(docNum, draftDocEntry),
      queryKey: apInvoiceKeys.detail(docNum, draftDocEntry),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => apInvoiceAPI.getAPInvoiceDocNums(search, limit),
      queryKey: apInvoiceKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: APInvoiceListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => apInvoiceAPI.getAPInvoices(params),
      queryKey: apInvoiceKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
