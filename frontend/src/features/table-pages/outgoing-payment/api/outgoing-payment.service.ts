import { z } from 'zod'

import {
  outgoingPaymentListItemSchema,
  outgoingPaymentListParamsSchema,
  outgoingPaymentListResponseSchema,
} from '@/features/table-pages/outgoing-payment/schemas/outgoing-payment-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type OutgoingPaymentListItem = z.infer<typeof outgoingPaymentListItemSchema>
export type OutgoingPaymentListParams = z.infer<typeof outgoingPaymentListParamsSchema>

export type OutgoingPaymentListResponse = z.infer<typeof outgoingPaymentListResponseSchema>
export type OutgoingPaymentDocNumLookupItem = { code: string; name: string }
export type OutgoingPaymentDocNumLookupResponse = {
  success: boolean
  data: OutgoingPaymentDocNumLookupItem[]
}

export const outgoingPaymentAPI = {
  getOutgoingPayments: async (params: OutgoingPaymentListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/outgoing-payments?${query}` : '/api/v1/outgoing-payments'
    return apiClient<OutgoingPaymentListResponse>(path)
  },
  getOutgoingPaymentDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/outgoing-payments/docnums?${query}`
      : '/api/v1/outgoing-payments/docnums'
    return apiClient<OutgoingPaymentDocNumLookupResponse>(path)
  },
}
