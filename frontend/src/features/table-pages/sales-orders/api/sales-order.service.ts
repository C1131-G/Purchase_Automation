import { z } from 'zod'

import {
  salesOrderListItemSchema,
  salesOrderListParamsSchema,
  salesOrderListResponseSchema,
} from '@/features/table-pages/sales-orders/schemas/sales-order-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type SalesOrderStatus = z.infer<typeof salesOrderListItemSchema>['DocStatus']

export type SalesOrderListItem = z.infer<typeof salesOrderListItemSchema>

export type SalesOrderListParams = z.infer<typeof salesOrderListParamsSchema>

export type SalesOrderListResponse = z.infer<typeof salesOrderListResponseSchema>
export type SalesOrderDocNumLookupItem = { code: string; name: string }
export type SalesOrderDocNumLookupResponse = {
  success: boolean
  data: SalesOrderDocNumLookupItem[]
}

export type CreateSalesOrderPayload = Record<string, unknown>

export const salesOrderAPI = {
  getSalesOrders: async (params: SalesOrderListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/sales-orders?${query}` : '/api/v1/sales-orders'
    return apiClient<SalesOrderListResponse>(path)
  },
  createSalesOrder: async (payload: CreateSalesOrderPayload) => {
    return apiClient<unknown>('/api/v1/sales-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getSalesOrderDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query ? `/api/v1/sales-orders/docnums?${query}` : '/api/v1/sales-orders/docnums'
    return apiClient<SalesOrderDocNumLookupResponse>(path)
  },
}
