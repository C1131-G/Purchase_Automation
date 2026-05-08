/** Purchase Order Service: Direct API interaction for ordering business logic. */
import type { z } from "zod";

import type {
  purchaseOrderListItemSchema,
  purchaseOrderListParamsSchema,
  purchaseOrderListResponseSchema,
} from "@/features/table-pages/purchase-orders/schemas/purchase-order-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderListItemSchema>["DocStatus"];

export type PurchaseOrderListItem = z.infer<typeof purchaseOrderListItemSchema>;

export type PurchaseOrderListParams = z.infer<typeof purchaseOrderListParamsSchema>;

export type PurchaseOrderListResponse = z.infer<typeof purchaseOrderListResponseSchema>;
export interface PurchaseOrderDocNumLookupItem {
  code: string;
  name: string;
}
export interface PurchaseOrderDocNumLookupResponse {
  success: boolean;
  data: PurchaseOrderDocNumLookupItem[];
}

export type CreatePurchaseOrderPayload = Record<string, unknown>;
export type UpdatePurchaseOrderPayload = Record<string, unknown>;
export interface CreatePurchaseOrderResponse {
  success: boolean;
  data: { DocEntry: number; DocNum: number };
}

export interface PurchaseOrderDetailLine {
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  OpenQty?: number;
  Price?: number;
  UnitPrice?: number;
  UoMCode?: string | number;
  UoMEntry?: number;
  DiscountPercent?: number;
  TaxCode?: string;
  VatGroup?: string;
  VatPrcnt?: number;
  WarehouseCode?: string;
  LineNum?: number;
  LineTotal?: number;
}

export interface PurchaseOrderDetail {
  id?: number;
  DocEntry?: number;
  DocNum?: number;
  SalesPersonCode?: number | string;
  DocDate?: string;
  DocDueDate?: string;
  CardCode?: string;
  CardName?: string;
  Address?: string;
  Address2?: string;
  NumAtCard?: string;
  Comments?: string;
  DocCurr?: string;
  DocTotal?: number;
  DocStatus?: "Open" | "Partial" | "Closed" | "O" | "C";
  DocumentLines?: PurchaseOrderDetailLine[];
}
export interface PurchaseOrderDetailResponse {
  success: boolean;
  data: PurchaseOrderDetail;
}

export const purchaseOrderAPI = {
  createPurchaseOrder: async (payload: CreatePurchaseOrderPayload) =>
    apiClient<CreatePurchaseOrderResponse>("/api/v1/purchase-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPurchaseOrderByDocNum: async (docNum: string | number) =>
    apiClient<PurchaseOrderDetailResponse>(`/api/v1/purchase-orders/by-doc-num/${docNum}`),
  getPurchaseOrderDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/purchase-orders/docnums?${query}`
      : "/api/v1/purchase-orders/docnums";
    return apiClient<PurchaseOrderDocNumLookupResponse>(path);
  },
  getPurchaseOrders: async (params: PurchaseOrderListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/purchase-orders?${query}` : "/api/v1/purchase-orders";
    return apiClient<PurchaseOrderListResponse>(path);
  },
  updatePurchaseOrder: async (id: string | number, payload: UpdatePurchaseOrderPayload) =>
    apiClient<unknown>(`/api/v1/purchase-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
