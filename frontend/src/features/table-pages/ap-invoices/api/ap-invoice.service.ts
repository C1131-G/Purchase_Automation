import { z } from 'zod'

import {
  apInvoiceListItemSchema,
  apInvoiceListParamsSchema,
  apInvoiceListResponseSchema,
} from '@/features/table-pages/ap-invoices/schemas/ap-invoice-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type APInvoiceStatus = z.infer<typeof apInvoiceListItemSchema>['DocStatus']

export type APInvoiceListItem = z.infer<typeof apInvoiceListItemSchema>

export type APInvoiceListParams = z.infer<typeof apInvoiceListParamsSchema>

export type APInvoiceListResponse = z.infer<typeof apInvoiceListResponseSchema>

export const apInvoiceAPI = {
  getAPInvoices: async (params: APInvoiceListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ap-invoices?${query}` : '/api/v1/ap-invoices'
    return apiClient<APInvoiceListResponse>(path)
  },
}
