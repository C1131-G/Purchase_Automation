/** Sales Quotation Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  salesQuotationAPI,
  type SalesQuotationListParams,
} from '@/features/table-pages/sales-quotations/api/sales-quotation.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const salesQuotationKeys = {
  all: ['sales-quotations'] as const,
  list: (params: SalesQuotationListParams) => [...salesQuotationKeys.all, 'list', params] as const,
  detailByDocNum: (docNum: string) => [...salesQuotationKeys.all, 'detail-by-doc-num', docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...salesQuotationKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
}

export const salesQuotationQueries = {
  list: (params: SalesQuotationListParams) =>
    queryOptions({
      queryKey: salesQuotationKeys.list(params),
      queryFn: () => salesQuotationAPI.getSalesQuotations(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: salesQuotationKeys.docNumSuggestions(search, limit),
      queryFn: () => salesQuotationAPI.getSalesQuotationDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryKey: salesQuotationKeys.detailByDocNum(docNum),
      queryFn: () => salesQuotationAPI.getSalesQuotationByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
