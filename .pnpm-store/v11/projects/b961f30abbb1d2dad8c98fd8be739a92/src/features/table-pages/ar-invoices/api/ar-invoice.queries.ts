/** AR Invoice Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { arInvoiceAPI } from "@/features/table-pages/ar-invoices/api/ar-invoice.service";
import type { ARInvoiceListParams } from "@/features/table-pages/ar-invoices/api/ar-invoice.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const arInvoiceKeys = {
  all: ["ar-invoices"] as const,
  detailByDocNum: (docNum: string) => [...arInvoiceKeys.all, "detail-by-doc-num", docNum] as const,
  detailById: (id: string | number) => [...arInvoiceKeys.all, "detail", id] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...arInvoiceKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: ARInvoiceListParams) => [...arInvoiceKeys.all, "list", params] as const,
};

export const arInvoiceQueries = {
  detailByDocNum: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: async () => {
        const cleanDocNum = String(docNum).replace(/["']/g, "").trim();
        const list = await arInvoiceAPI.getARInvoices({
          page: 1,
          limit: 10,
          DocNum: cleanDocNum,
        });
        const exact = (list.data ?? []).find((item) => String(item.DocNum).trim() === cleanDocNum);
        const fallback = list.data?.[0];
        const target = exact ?? fallback;
        if (!target?.id && target?.id !== 0) {
          throw new Error("A/R invoice not found");
        }
        return arInvoiceAPI.getARInvoiceById(target.id);
      },
      queryKey: arInvoiceKeys.detailByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  detailById: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => arInvoiceAPI.getARInvoiceById(id),
      queryKey: arInvoiceKeys.detailById(id),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => arInvoiceAPI.getARInvoiceDocNums(search, limit),
      queryKey: arInvoiceKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: ARInvoiceListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => arInvoiceAPI.getARInvoices(params),
      queryKey: arInvoiceKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
