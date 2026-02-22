import { z } from 'zod'

import {
  purchaseOrderListItemSchema,
  purchaseOrderListParamsSchema,
  purchaseOrderListResponseSchema,
} from '@/features/table-pages/purchase-orders/schemas/purchase-order-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderListItemSchema>['DocStatus']

export type PurchaseOrderListItem = z.infer<typeof purchaseOrderListItemSchema>

export type PurchaseOrderListParams = z.infer<typeof purchaseOrderListParamsSchema>

export type PurchaseOrderListResponse = z.infer<typeof purchaseOrderListResponseSchema>
export type PurchaseOrderDocNumLookupItem = { code: string; name: string }
export type PurchaseOrderDocNumLookupResponse = {
  success: boolean
  data: PurchaseOrderDocNumLookupItem[]
}

export type CreatePurchaseOrderPayload = Record<string, unknown>

export const purchaseOrderAPI = {
  getPurchaseOrders: async (params: PurchaseOrderListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/purchase-orders?${query}` : '/api/v1/purchase-orders'
    return apiClient<PurchaseOrderListResponse>(path)
  },
  getPurchaseOrderDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/purchase-orders/docnums?${query}`
      : '/api/v1/purchase-orders/docnums'
    return apiClient<PurchaseOrderDocNumLookupResponse>(path)
  },
  createPurchaseOrder: async (payload: CreatePurchaseOrderPayload) => {
    return apiClient<unknown>('/api/v1/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
