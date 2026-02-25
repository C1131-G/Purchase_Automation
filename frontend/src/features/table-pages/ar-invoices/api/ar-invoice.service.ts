/** AR Invoice Service: Direct API interaction for receivable business logic. */
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
export type ARInvoiceDocNumLookupItem = { code: string; name: string }
export type ARInvoiceDocNumLookupResponse = {
  success: boolean
  data: ARInvoiceDocNumLookupItem[]
}
export type CreateARInvoicePayload = Record<string, unknown>
export type UpdateARInvoicePayload = Record<string, unknown>
export type ARInvoiceDetailLine = {
  ItemCode?: string
  ItemDescription?: string
  Quantity?: number
  Price?: number
  UnitPrice?: number
  DiscountPercent?: number
  UoMCode?: string | number
  UoMEntry?: number
  TaxCode?: string
  WarehouseCode?: string
  LineTotal?: number
  BaseEntry?: number
  BaseLine?: number
  BaseType?: number
}
export type ARInvoiceDetail = {
  id?: number
  DocEntry?: number
  DocNum?: number
  SalesPersonCode?: number | string
  DocDate?: string
  DocDueDate?: string
  CardCode?: string
  CardName?: string
  Address?: string
  NumAtCard?: string
  Comments?: string
  DocCurr?: string
  DocStatus?: string
  DocumentLines?: ARInvoiceDetailLine[]
}
export type ARInvoiceDetailResponse = { success: boolean; data: ARInvoiceDetail }

export const arInvoiceAPI = {
  getARInvoices: async (params: ARInvoiceListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ar-invoices?${query}` : '/api/v1/ar-invoices'
    return apiClient<ARInvoiceListResponse>(path)
  },
  createARInvoice: async (payload: CreateARInvoicePayload) =>
    apiClient<unknown>('/api/v1/ar-invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateARInvoice: async (id: string | number, payload: UpdateARInvoicePayload) =>
    apiClient<unknown>(`/api/v1/ar-invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getARInvoiceDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query ? `/api/v1/ar-invoices/docnums?${query}` : '/api/v1/ar-invoices/docnums'
    return apiClient<ARInvoiceDocNumLookupResponse>(path)
  },
  getARInvoiceById: async (id: string | number) => {
    return apiClient<ARInvoiceDetailResponse>(`/api/v1/ar-invoices/${id}`)
  },
}
