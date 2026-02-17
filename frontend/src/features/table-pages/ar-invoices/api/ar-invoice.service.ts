import { z } from 'zod'

import {
  arInvoiceListItemSchema,
  arInvoiceListParamsSchema,
  arInvoiceListResponseSchema,
} from '@/features/table-pages/ar-invoices/schemas/ar-invoice-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type ARInvoiceStatus = z.infer<typeof arInvoiceListItemSchema>['DocStatus']

export type ARInvoiceListItem = z.infer<typeof arInvoiceListItemSchema>

export type ARInvoiceListParams = z.infer<typeof arInvoiceListParamsSchema>

export type ARInvoiceListResponse = z.infer<typeof arInvoiceListResponseSchema>

export const arInvoiceAPI = {
  getARInvoices: async (params: ARInvoiceListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ar-invoices?${query}` : '/api/v1/ar-invoices'
    return apiClient<ARInvoiceListResponse>(path)
  },
}
