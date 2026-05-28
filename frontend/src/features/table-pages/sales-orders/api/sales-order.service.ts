/** Sales Order Service: Direct API interaction for sales business logic. */
import type { z } from "zod";

import type {
  salesOrderListItemSchema,
  salesOrderListParamsSchema,
  salesOrderListResponseSchema,
} from "@/features/table-pages/sales-orders/schemas/sales-order-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type SalesOrderStatus = z.infer<typeof salesOrderListItemSchema>["DocStatus"];

export type SalesOrderListItem = z.infer<typeof salesOrderListItemSchema>;

export type SalesOrderListParams = z.infer<typeof salesOrderListParamsSchema>;

export type SalesOrderListResponse = z.infer<typeof salesOrderListResponseSchema>;
export interface SalesOrderDocNumLookupItem {
  code: string;
  name: string;
}
export interface SalesOrderDocNumLookupResponse {
  success: boolean;
  data: SalesOrderDocNumLookupItem[];
}

export type CreateSalesOrderPayload = Record<string, unknown>;
export type UpdateSalesOrderPayload = Record<string, unknown>;

export interface SalesOrderDetailLine {
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  Price?: number;
  UnitPrice?: number;
  DiscountPercent?: number;
  UoMCode?: string | number;
  UoMEntry?: number;
  VatGroup?: string;
  VatPrcnt?: number;
  TaxCode?: string;
  WarehouseCode?: string;
  LineTotal?: number;
  LineNum?: number;
  RemainingOpenQuantity?: number;
}

export interface OpenSalesOrderLine {
  DocEntry: number;
  DocNum: number;
  DocDate: string;
  DocCurr: string;
  LineNum: number;
  ItemCode: string;
  ItemDescription: string;
  Quantity: number;
  OpenQty: number;
  Price: number;
  VatGroup?: string;
  VatPrcnt?: number;
  TaxCode?: string;
  WarehouseCode: string;
  UoMCode?: string | number;
  UoMEntry?: number;
  DiscountPercent?: number;
}

export interface OpenSalesOrderLinesResponse {
  success: boolean;
  data: OpenSalesOrderLine[];
}

export interface SalesOrderDetail {
  id?: number;
  DocEntry?: number;
  DocNum?: number;
  SalesPersonCode?: number | string;
  DocDate?: string;
  DocDueDate?: string;
  CardCode?: string;
  CardName?: string;
  Address?: string;
  Comments?: string;
  NumAtCard?: string;
  DocCurr?: string;
  DocStatus?: string;
  DocumentLines?: SalesOrderDetailLine[];
}
export interface SalesOrderDetailResponse {
  success: boolean;
  data: SalesOrderDetail;
}

export const salesOrderAPI = {
  createSalesOrder: async (payload: CreateSalesOrderPayload) =>
    apiClient<unknown>("/api/v1/sales-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getOpenSalesOrderLines: async (cardCode: string) =>
    apiClient<OpenSalesOrderLinesResponse>(`/api/v1/sales-orders/open-lines?cardCode=${cardCode}`),
  getSalesOrderByDocNum: async (docNum: string | number) =>
    apiClient<SalesOrderDetailResponse>(`/api/v1/sales-orders/by-doc-num/${docNum}`),
  getSalesOrderDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query ? `/api/v1/sales-orders/docnums?${query}` : "/api/v1/sales-orders/docnums";
    return apiClient<SalesOrderDocNumLookupResponse>(path);
  },
  getSalesOrders: async (params: SalesOrderListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/sales-orders?${query}` : "/api/v1/sales-orders";
    return apiClient<SalesOrderListResponse>(path);
  },
  updateSalesOrder: async (id: string | number, payload: UpdateSalesOrderPayload) =>
    apiClient<unknown>(`/api/v1/sales-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
