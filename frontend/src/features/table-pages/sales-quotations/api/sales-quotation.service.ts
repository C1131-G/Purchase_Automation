/** Sales Quotation Service: Direct API interaction for sales business logic. */
import type { z } from "zod";

import type {
  salesQuotationListItemSchema,
  salesQuotationListParamsSchema,
  salesQuotationListResponseSchema,
} from "@/features/table-pages/sales-quotations/schemas/sales-quotation-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type SalesQuotationStatus = z.infer<typeof salesQuotationListItemSchema>["DocStatus"];

export type SalesQuotationListItem = z.infer<typeof salesQuotationListItemSchema>;

export type SalesQuotationListParams = z.infer<typeof salesQuotationListParamsSchema>;

export type SalesQuotationListResponse = z.infer<typeof salesQuotationListResponseSchema>;
export interface SalesQuotationDocNumLookupItem {
  code: string;
  name: string;
}
export interface SalesQuotationDocNumLookupResponse {
  success: boolean;
  data: SalesQuotationDocNumLookupItem[];
}

export type CreateSalesQuotationPayload = Record<string, unknown>;
export type UpdateSalesQuotationPayload = Record<string, unknown>;

export interface SalesQuotationDetailLine {
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

export interface SalesQuotationDetail {
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
  DocCurr?: string;
  DocStatus?: string;
  DocumentLines?: SalesQuotationDetailLine[];
}
export interface SalesQuotationDetailResponse {
  success: boolean;
  data: SalesQuotationDetail;
}

export interface OpenSalesQuotationLine {
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
  WarehouseCode: string;
  UoMCode?: string | number;
  UoMEntry?: number;
  DiscountPercent?: number;
  LineTotal?: number;
}

export interface OpenSalesQuotationLinesResponse {
  success: boolean;
  data: OpenSalesQuotationLine[];
}

export const salesQuotationAPI = {
  createSalesQuotation: async (payload: CreateSalesQuotationPayload) =>
    apiClient<unknown>("/api/v1/sales-quotations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getOpenSalesQuotationLines: async (cardCode: string) =>
    apiClient<OpenSalesQuotationLinesResponse>(
      `/api/v1/sales-quotations/open-lines?cardCode=${cardCode}`,
    ),
  getSalesQuotationByDocNum: async (docNum: string | number) =>
    apiClient<SalesQuotationDetailResponse>(`/api/v1/sales-quotations/by-doc-num/${docNum}`),
  getSalesQuotationDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/sales-quotations/docnums?${query}`
      : "/api/v1/sales-quotations/docnums";
    return apiClient<SalesQuotationDocNumLookupResponse>(path);
  },
  getSalesQuotations: async (params: SalesQuotationListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/sales-quotations?${query}` : "/api/v1/sales-quotations";
    return apiClient<SalesQuotationListResponse>(path);
  },
  updateSalesQuotation: async (id: string | number, payload: UpdateSalesQuotationPayload) =>
    apiClient<unknown>(`/api/v1/sales-quotations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
