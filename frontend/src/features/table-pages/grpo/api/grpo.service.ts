/** GRPO Service: Direct API interaction for receipt business logic. */
import { z } from 'zod'

import {
  grpoListItemSchema,
  grpoListParamsSchema,
  grpoListResponseSchema,
} from '@/features/table-pages/grpo/schemas/grpo-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type GRPOStatus = z.infer<typeof grpoListItemSchema>['DocStatus']

export type GRPOListItem = z.infer<typeof grpoListItemSchema>

export type GRPOListParams = z.infer<typeof grpoListParamsSchema>

export type GRPOListResponse = z.infer<typeof grpoListResponseSchema>
export type GRPODocNumLookupItem = { code: string; name: string }
export type GRPODocNumLookupResponse = {
  success: boolean
  data: GRPODocNumLookupItem[]
}
export type AvailablePOItem = {
  id: number
  purchaseOrderNo: string
  poDate?: string
  vendorCode?: string
  vendorName?: string
  vendorRefNumber?: string
  total?: number
}
export type AvailablePOResponse = {
  success: boolean
  data: AvailablePOItem[]
}

export type GRPOCreatePODetailLine = {
  ItemCode?: string
  ItemDescription?: string
  Quantity?: number
  UoMCode?: string | number
  UoMEntry?: number
  Price?: number
  WarehouseCode?: string
  TaxCode?: string
  BaseEntry?: number
  BaseLine?: number
  BaseType?: number
}

export type GRPOCreatePODetail = {
  id?: number
  DocEntry?: number
  DocNum?: number
  DocDate?: string
  DocDueDate?: string
  CardCode?: string
  CardName?: string
  Address?: string
  Address2?: string
  NumAtCard?: string
  DocTotal?: number
  DocumentLines?: GRPOCreatePODetailLine[]
}
export type GRPOCreatePODetailResponse = { success: boolean; data: GRPOCreatePODetail }
export type CreateGRPOPayload = Record<string, unknown>
export type UpdateGRPOPayload = Record<string, unknown>

export type GRPODetailLine = {
  ItemCode?: string
  ItemDescription?: string
  Quantity?: number
  Price?: number
  UnitPrice?: number
  DiscountPercent?: number
  UoMCode?: string | number
  UoMEntry?: number
  WarehouseCode?: string
  LineTotal?: number
  BaseEntry?: number
  BaseLine?: number
  BaseType?: number
}

export type GRPODetail = {
  id?: number
  DocEntry?: number
  DocNum?: number
  DocDate?: string
  DocDueDate?: string
  SalesPersonCode?: string | number
  CardCode?: string
  CardName?: string
  Address?: string
  Address2?: string
  Comments?: string
  NumAtCard?: string
  DocTotal?: number
  DocCurr?: string
  DocStatus?: string
  DocumentLines?: GRPODetailLine[]
}

export type GRPODetailResponse = { success: boolean; data: GRPODetail }

export const grpoAPI = {
  getGRPOs: async (params: GRPOListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/grpos?${query}` : '/api/v1/grpos'
    return apiClient<GRPOListResponse>(path)
  },
  getGRPODocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query ? `/api/v1/grpos/docnums?${query}` : '/api/v1/grpos/docnums'
    return apiClient<GRPODocNumLookupResponse>(path)
  },
  getAvailablePOs: async (vendorCode: string) => {
    const query = toQueryString({ vendorCode })
    const path = `/api/v1/grpos/available-pos?${query}`
    return apiClient<AvailablePOResponse>(path)
  },
  getPODetailForGRPO: async (id: string | number) => {
    return apiClient<GRPOCreatePODetailResponse>(`/api/v1/grpos/po-detail/${id}`)
  },
  createGRPO: async (payload: CreateGRPOPayload) => {
    return apiClient<unknown>('/api/v1/grpos', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateGRPO: async (id: string | number, payload: UpdateGRPOPayload) => {
    return apiClient<unknown>(`/api/v1/grpos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  getGRPOById: async (id: string | number) => {
    return apiClient<GRPODetailResponse>(`/api/v1/grpos/${id}`)
  },
}
