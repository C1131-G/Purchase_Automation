/** AR Invoice Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  arInvoiceAPI,
  type ARInvoiceListParams,
} from '@/features/table-pages/ar-invoices/api/ar-invoice.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const arInvoiceKeys = {
  all: ['ar-invoices'] as const,
  list: (params: ARInvoiceListParams) => [...arInvoiceKeys.all, 'list', params] as const,
  detailByDocNum: (docNum: string) => [...arInvoiceKeys.all, 'detail-by-doc-num', docNum] as const,
  detailById: (id: string | number) => [...arInvoiceKeys.all, 'detail', id] as const,
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
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryKey: arInvoiceKeys.detailByDocNum(docNum),
      queryFn: async () => {
        const list = await arInvoiceAPI.getARInvoices({
          page: 1,
          limit: 10,
          DocNum: String(docNum).trim(),
        })
        const exact = (list.data ?? []).find((item) => String(item.DocNum).trim() === docNum.trim())
        const fallback = list.data?.[0]
        const target = exact ?? fallback
        if (!target?.id && target?.id !== 0) {
          throw new Error('A/R invoice not found')
        }
        return arInvoiceAPI.getARInvoiceById(target.id)
      },
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  detailById: (id: string | number) =>
    queryOptions({
      queryKey: arInvoiceKeys.detailById(id),
      queryFn: () => arInvoiceAPI.getARInvoiceById(id),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
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
