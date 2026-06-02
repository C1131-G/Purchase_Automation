/** AP Invoice Service: Direct API interaction for payable business logic. */
import type { z } from "zod";

import type {
  apInvoiceDetailSchema,
  apInvoiceListItemSchema,
  apInvoiceListParamsSchema,
  apInvoiceListResponseSchema,
  createAPInvoiceInputSchema,
  updateAPInvoiceInputSchema,
} from "@/features/table-pages/ap-invoices/schemas/ap-invoice-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type APInvoiceStatus = z.infer<typeof apInvoiceListItemSchema>["DocStatus"];

export type APInvoiceListItem = z.infer<typeof apInvoiceListItemSchema>;

export type APInvoiceListParams = z.infer<typeof apInvoiceListParamsSchema>;

export type APInvoiceListResponse = z.infer<typeof apInvoiceListResponseSchema>;
export interface APInvoiceDocNumLookupItem {
  code: string;
  name: string;
}
export interface APInvoiceDocNumLookupResponse {
  success: boolean;
  data: APInvoiceDocNumLookupItem[];
}

export type APInvoiceDetail = z.infer<typeof apInvoiceDetailSchema>;
export interface APInvoiceDetailResponse {
  success: boolean;
  data: APInvoiceDetail;
}

export type CreateAPInvoiceInput = z.infer<typeof createAPInvoiceInputSchema>;
export type UpdateAPInvoiceInput = z.infer<typeof updateAPInvoiceInputSchema>;

export const apInvoiceAPI = {
  createAPInvoice: async (payload: CreateAPInvoiceInput) =>
    apiClient<{
      success: boolean;
      message: string;
      data: { DocEntry: number; DocNum: number };
    }>("/api/v1/ap-invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAPInvoice: async (docNum: string) =>
    apiClient<APInvoiceDetailResponse>(`/api/v1/ap-invoices/${docNum}`),
  getAPInvoiceDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query ? `/api/v1/ap-invoices/docnums?${query}` : "/api/v1/ap-invoices/docnums";
    return apiClient<APInvoiceDocNumLookupResponse>(path);
  },
  getAPInvoices: async (params: APInvoiceListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/ap-invoices?${query}` : "/api/v1/ap-invoices";
    return apiClient<APInvoiceListResponse>(path);
  },
  updateAPInvoice: async (id: string | number, payload: UpdateAPInvoiceInput) =>
    apiClient<{ success: boolean; message: string }>("/api/v1/ap-invoices/" + id, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  reopenAPInvoice: async (id: string | number) =>
    apiClient<{ success: boolean; message: string }>("/api/v1/ap-invoices/" + id + "/reopen", {
      method: "POST",
    }),
};
