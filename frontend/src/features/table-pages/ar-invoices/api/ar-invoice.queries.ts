import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  arInvoiceAPI,
  type ARInvoiceListParams,
} from '@/features/table-pages/ar-invoices/api/ar-invoice.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const arInvoiceKeys = {
  all: ['ar-invoices'] as const,
  list: (params: ARInvoiceListParams) => [...arInvoiceKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...arInvoiceKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
}

export const arInvoiceQueries = {
  list: (params: ARInvoiceListParams) =>
    queryOptions({
      queryKey: arInvoiceKeys.list(params),
      queryFn: () => arInvoiceAPI.getARInvoices(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: arInvoiceKeys.docNumSuggestions(search, limit),
      queryFn: () => arInvoiceAPI.getARInvoiceDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
