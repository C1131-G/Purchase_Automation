/** AP Invoice Service: Direct API interaction for payable business logic. */
import { z } from 'zod'

import {
  apInvoiceDetailSchema,
  apInvoiceListItemSchema,
  apInvoiceListParamsSchema,
  apInvoiceListResponseSchema,
  createAPInvoiceInputSchema,
  updateAPInvoiceInputSchema,
} from '@/features/table-pages/ap-invoices/schemas/ap-invoice-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type APInvoiceStatus = z.infer<typeof apInvoiceListItemSchema>['DocStatus']

export type APInvoiceListItem = z.infer<typeof apInvoiceListItemSchema>

export type APInvoiceListParams = z.infer<typeof apInvoiceListParamsSchema>

export type APInvoiceListResponse = z.infer<typeof apInvoiceListResponseSchema>
export type APInvoiceDocNumLookupItem = { code: string; name: string }
export type APInvoiceDocNumLookupResponse = {
  success: boolean
  data: APInvoiceDocNumLookupItem[]
}

export type APInvoiceDetail = z.infer<typeof apInvoiceDetailSchema>
export type APInvoiceDetailResponse = {
  success: boolean
  data: APInvoiceDetail
}

export type CreateAPInvoiceInput = z.infer<typeof createAPInvoiceInputSchema>
export type UpdateAPInvoiceInput = z.infer<typeof updateAPInvoiceInputSchema>

export const apInvoiceAPI = {
  getAPInvoices: async (params: APInvoiceListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ap-invoices?${query}` : '/api/v1/ap-invoices'
    return apiClient<APInvoiceListResponse>(path)
  },
  getAPInvoice: async (docNum: string) => {
    return apiClient<APInvoiceDetailResponse>(`/api/v1/ap-invoices/${docNum}`)
  },
  getAPInvoiceDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query ? `/api/v1/ap-invoices/docnums?${query}` : '/api/v1/ap-invoices/docnums'
    return apiClient<APInvoiceDocNumLookupResponse>(path)
  },
  createAPInvoice: async (payload: CreateAPInvoiceInput) => {
    return apiClient<{ success: boolean; message: string; data: any }>('/api/v1/ap-invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateAPInvoice: async (id: string | number, payload: UpdateAPInvoiceInput) => {
    return apiClient<{ success: boolean; message: string }>('/api/v1/ap-invoices/' + id, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
}
