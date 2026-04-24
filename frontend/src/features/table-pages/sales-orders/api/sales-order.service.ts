/** Sales Order Service: Direct API interaction for sales business logic. */
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
export type UpdateSalesOrderPayload = Record<string, unknown>

export type SalesOrderDetailLine = {
  ItemCode?: string
  ItemDescription?: string
  Quantity?: number
  Price?: number
  UnitPrice?: number
  DiscountPercent?: number
  UoMCode?: string | number
  UoMEntry?: number
  VatGroup?: string
  VatPrcnt?: number
  TaxCode?: string
  WarehouseCode?: string
  LineTotal?: number
  LineNum?: number
  RemainingOpenQuantity?: number
}

export type OpenSalesOrderLine = {
  DocEntry: number
  DocNum: number
  DocDate: string
  DocCurr: string
  LineNum: number
  ItemCode: string
  ItemDescription: string
  Quantity: number
  OpenQty: number
  Price: number
  VatGroup?: string
  VatPrcnt?: number
  TaxCode?: string
  WarehouseCode: string
  UoMCode?: string | number
  UoMEntry?: number
  DiscountPercent?: number
}

export type OpenSalesOrderLinesResponse = {
  success: boolean
  data: OpenSalesOrderLine[]
}

export type SalesOrderDetail = {
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
  DocumentLines?: SalesOrderDetailLine[]
}
export type SalesOrderDetailResponse = { success: boolean; data: SalesOrderDetail }

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
  updateSalesOrder: async (id: string | number, payload: UpdateSalesOrderPayload) => {
    return apiClient<unknown>(`/api/v1/sales-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  getSalesOrderByDocNum: async (docNum: string | number) => {
    return apiClient<SalesOrderDetailResponse>(`/api/v1/sales-orders/by-doc-num/${docNum}`)
  },
  getSalesOrderDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query ? `/api/v1/sales-orders/docnums?${query}` : '/api/v1/sales-orders/docnums'
    return apiClient<SalesOrderDocNumLookupResponse>(path)
  },
  getOpenSalesOrderLines: async (cardCode: string) => {
    return apiClient<OpenSalesOrderLinesResponse>(
      `/api/v1/sales-orders/open-lines?cardCode=${cardCode}`,
    )
  },
}
