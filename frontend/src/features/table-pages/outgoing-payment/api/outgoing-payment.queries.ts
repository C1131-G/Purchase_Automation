import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  outgoingPaymentAPI,
  type OutgoingPaymentListParams,
} from '@/features/table-pages/outgoing-payment/api/outgoing-payment.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const outgoingPaymentKeys = {
  all: ['outgoing-payments'] as const,
  list: (params: OutgoingPaymentListParams) =>
    [...outgoingPaymentKeys.all, 'list', params] as const,
}

export const outgoingPaymentQueries = {
  list: (params: OutgoingPaymentListParams) =>
    queryOptions({
      queryKey: outgoingPaymentKeys.list(params),
      queryFn: () => outgoingPaymentAPI.getOutgoingPayments(params),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.list.staleTime,
      gcTime: QUERY_CACHE_POLICY.list.gcTime,
    }),
}
