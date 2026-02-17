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
}

export const incomingPaymentQueries = {
  list: (params: IncomingPaymentListParams) =>
    queryOptions({
      queryKey: incomingPaymentKeys.list(params),
      queryFn: () => incomingPaymentAPI.getIncomingPayments(params),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.list.staleTime,
      gcTime: QUERY_CACHE_POLICY.list.gcTime,
    }),
}
