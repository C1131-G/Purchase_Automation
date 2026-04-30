/** Incoming Payment Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  incomingPaymentAPI,
  type IncomingPaymentListParams,
} from '@/features/table-pages/incoming-payment/api/incoming-payment.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const incomingPaymentKeys = {
  all: ['incoming-payments'] as const,
  list: (params: IncomingPaymentListParams) =>
    [...incomingPaymentKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...incomingPaymentKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
  detail: (docNum: string) => [...incomingPaymentKeys.all, 'detail', docNum] as const,
}

export const incomingPaymentQueries = {
  list: (params: IncomingPaymentListParams) =>
    queryOptions({
      queryKey: incomingPaymentKeys.list(params),
      queryFn: () => incomingPaymentAPI.getIncomingPayments(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: incomingPaymentKeys.docNumSuggestions(search, limit),
      queryFn: () => incomingPaymentAPI.getIncomingPaymentDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  detail: (docNum: string) =>
    queryOptions({
      queryKey: incomingPaymentKeys.detail(docNum),
      queryFn: () => incomingPaymentAPI.getIncomingPayment(docNum),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
    }),
}
