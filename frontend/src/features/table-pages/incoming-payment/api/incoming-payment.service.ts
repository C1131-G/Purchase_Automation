import { z } from 'zod'

import {
  incomingPaymentListItemSchema,
  incomingPaymentListParamsSchema,
  incomingPaymentListResponseSchema,
} from '@/features/table-pages/incoming-payment/schemas/incoming-payment-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type IncomingPaymentListItem = z.infer<typeof incomingPaymentListItemSchema>
export type IncomingPaymentListParams = z.infer<typeof incomingPaymentListParamsSchema>

export type IncomingPaymentListResponse = z.infer<typeof incomingPaymentListResponseSchema>
export type IncomingPaymentDocNumLookupItem = { code: string; name: string }
export type IncomingPaymentDocNumLookupResponse = {
  success: boolean
  data: IncomingPaymentDocNumLookupItem[]
}

export const incomingPaymentAPI = {
  getIncomingPayments: async (params: IncomingPaymentListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/incoming-payments?${query}` : '/api/v1/incoming-payments'
    return apiClient<IncomingPaymentListResponse>(path)
  },
  getIncomingPaymentDocNums: async (search?: string) => {
    const query = toQueryString({ search })
    const path = query
      ? `/api/v1/incoming-payments/docnums?${query}`
      : '/api/v1/incoming-payments/docnums'
    return apiClient<IncomingPaymentDocNumLookupResponse>(path)
  },
}
