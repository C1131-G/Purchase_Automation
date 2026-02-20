import { queryOptions } from '@tanstack/react-query'

import {
  incomingPaymentAPI,
  type IncomingPaymentListParams,
} from '@/features/table-pages/incoming-payment/api/incoming-payment.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const incomingPaymentKeys = {
  all: ['incoming-payments'] as const,
  list: (params: IncomingPaymentListParams) =>
    [...incomingPaymentKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string) =>
    [...incomingPaymentKeys.all, 'doc-num-suggestions', search ?? ''] as const,
}

export const incomingPaymentQueries = {
  list: (params: IncomingPaymentListParams) =>
    queryOptions({
      queryKey: incomingPaymentKeys.list(params),
      queryFn: () => incomingPaymentAPI.getIncomingPayments(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
  docNumSuggestions: (search?: string) =>
    queryOptions({
      queryKey: incomingPaymentKeys.docNumSuggestions(search),
      queryFn: () => incomingPaymentAPI.getIncomingPaymentDocNums(search),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
