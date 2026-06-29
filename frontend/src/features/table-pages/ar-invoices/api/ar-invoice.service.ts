/** AR Invoice Service: Direct API interaction for receivable business logic. */
import type { z } from "zod";

import type {
  arInvoiceListItemSchema,
  arInvoiceListParamsSchema,
  arInvoiceListResponseSchema,
} from "@/features/table-pages/ar-invoices/schemas/ar-invoice-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type ARInvoiceStatus = z.infer<typeof arInvoiceListItemSchema>["DocStatus"];

export type ARInvoiceListItem = z.infer<typeof arInvoiceListItemSchema>;

export type ARInvoiceListParams = z.infer<typeof arInvoiceListParamsSchema>;

export type ARInvoiceListResponse = z.infer<typeof arInvoiceListResponseSchema>;
export interface ARInvoiceDocNumLookupItem {
  code: string;
  name: string;
}
export interface ARInvoiceDocNumLookupResponse {
  success: boolean;
  data: ARInvoiceDocNumLookupItem[];
}
export type CreateARInvoicePayload = Record<string, unknown>;
export type UpdateARInvoicePayload = Record<string, unknown>;
export interface ARInvoiceDetailLine {
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
  BaseEntry?: number;
  BaseLine?: number;
  BaseType?: number;
  RemainingOpenQuantity?: number;
}

export interface ARInvoiceDetail {
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
  DocStatus?: string;
  DocumentLines?: ARInvoiceDetailLine[];
}
export interface ARInvoiceDetailResponse {
  success: boolean;
  data: ARInvoiceDetail;
}

export const arInvoiceAPI = {
  createARInvoice: async (payload: CreateARInvoicePayload) =>
    apiClient<unknown>("/api/v1/ar-invoices", {
      body: JSON.stringify(payload),
      method: "POST",
    }),
  getARInvoiceById: async (id: string | number, draftDocEntry?: string) => {
    const url = draftDocEntry
      ? `/api/v1/ar-invoices/${id}?draftDocEntry=${draftDocEntry}`
      : `/api/v1/ar-invoices/${id}`;
    return apiClient<ARInvoiceDetailResponse>(url);
  },
  getARInvoiceDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query ? `/api/v1/ar-invoices/docnums?${query}` : "/api/v1/ar-invoices/docnums";
    return apiClient<ARInvoiceDocNumLookupResponse>(path);
  },
  getARInvoices: async (params: ARInvoiceListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/ar-invoices?${query}` : "/api/v1/ar-invoices";
    return apiClient<ARInvoiceListResponse>(path);
  },
  updateARInvoice: async (id: string | number, payload: UpdateARInvoicePayload) =>
    apiClient<unknown>(`/api/v1/ar-invoices/${id}`, {
      body: JSON.stringify(payload),
      method: "PATCH",
    }),
  reopenARInvoice: async (id: string | number) =>
    apiClient<unknown>(`/api/v1/ar-invoices/${id}/reopen`, {
      method: "POST",
    }),
};
