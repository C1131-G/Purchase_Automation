/** Sales Quotation Service: Direct API interaction for sales business logic. */
import { z } from 'zod'

import {
  salesQuotationListItemSchema,
  salesQuotationListParamsSchema,
  salesQuotationListResponseSchema,
} from '@/features/table-pages/sales-quotations/schemas/sales-quotation-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type SalesQuotationStatus = z.infer<typeof salesQuotationListItemSchema>['DocStatus']

export type SalesQuotationListItem = z.infer<typeof salesQuotationListItemSchema>

export type SalesQuotationListParams = z.infer<typeof salesQuotationListParamsSchema>

export type SalesQuotationListResponse = z.infer<typeof salesQuotationListResponseSchema>
export type SalesQuotationDocNumLookupItem = { code: string; name: string }
export type SalesQuotationDocNumLookupResponse = {
  success: boolean
  data: SalesQuotationDocNumLookupItem[]
}

export type CreateSalesQuotationPayload = Record<string, unknown>
export type UpdateSalesQuotationPayload = Record<string, unknown>

export type SalesQuotationDetailLine = {
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
}

export type SalesQuotationDetail = {
  id?: number
  DocEntry?: number
  DocNum?: number
  SalesPersonCode?: number | string
  DocDate?: string
  DocDueDate?: string
  CardCode?: string
  CardName?: string
  Address?: string
  Comments?: string
  DocCurr?: string
  DocStatus?: string
  DocumentLines?: SalesQuotationDetailLine[]
}
export type SalesQuotationDetailResponse = { success: boolean; data: SalesQuotationDetail }

export const salesQuotationAPI = {
  getSalesQuotations: async (params: SalesQuotationListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/sales-quotations?${query}` : '/api/v1/sales-quotations'
    return apiClient<SalesQuotationListResponse>(path)
  },
  createSalesQuotation: async (payload: CreateSalesQuotationPayload) => {
    return apiClient<unknown>('/api/v1/sales-quotations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateSalesQuotation: async (id: string | number, payload: UpdateSalesQuotationPayload) => {
    return apiClient<unknown>(`/api/v1/sales-quotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  getSalesQuotationByDocNum: async (docNum: string | number) => {
    return apiClient<SalesQuotationDetailResponse>(`/api/v1/sales-quotations/by-doc-num/${docNum}`)
  },
  getSalesQuotationDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query ? `/api/v1/sales-quotations/docnums?${query}` : '/api/v1/sales-quotations/docnums'
    return apiClient<SalesQuotationDocNumLookupResponse>(path)
  },
}
