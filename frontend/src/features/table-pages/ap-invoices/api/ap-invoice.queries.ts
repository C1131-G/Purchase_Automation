import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  apInvoiceAPI,
  type APInvoiceListParams,
} from '@/features/table-pages/ap-invoices/api/ap-invoice.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const apInvoiceKeys = {
  all: ['ap-invoices'] as const,
  list: (params: APInvoiceListParams) => [...apInvoiceKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...apInvoiceKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
}

export const apInvoiceQueries = {
  list: (params: APInvoiceListParams) =>
    queryOptions({
      queryKey: apInvoiceKeys.list(params),
      queryFn: () => apInvoiceAPI.getAPInvoices(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: apInvoiceKeys.docNumSuggestions(search, limit),
      queryFn: () => apInvoiceAPI.getAPInvoiceDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
