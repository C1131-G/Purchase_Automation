/** Purchase Quotation Service: Direct API interaction for purchase quotation business logic. */
import type { z } from "zod";

import type {
  purchaseQuotationListItemSchema,
  purchaseQuotationListParamsSchema,
  purchaseQuotationListResponseSchema,
} from "@/features/table-pages/purchase-quotations/schemas/purchase-quotation-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type PurchaseQuotationStatus = z.infer<typeof purchaseQuotationListItemSchema>["DocStatus"];

export type PurchaseQuotationListItem = z.infer<typeof purchaseQuotationListItemSchema>;

export type PurchaseQuotationListParams = z.infer<typeof purchaseQuotationListParamsSchema>;

export type PurchaseQuotationListResponse = z.infer<typeof purchaseQuotationListResponseSchema>;
export interface PurchaseQuotationDocNumLookupItem {
  code: string;
  name: string;
}
export interface PurchaseQuotationDocNumLookupResponse {
  success: boolean;
  data: PurchaseQuotationDocNumLookupItem[];
}

export type CreatePurchaseQuotationPayload = Record<string, unknown>;
export type UpdatePurchaseQuotationPayload = Record<string, unknown>;

export interface PurchaseQuotationDetailLine {
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  RequiredQuantity?: number;
  Price?: number;
  UnitPrice?: number;
  DiscountPercent?: number;
  ReqDate?: string;
  RequiredDate?: string;
  UoMCode?: string | number;
  UoMEntry?: number;
  VatGroup?: string;
  VatPrcnt?: number;
  TaxCode?: string;
  WarehouseCode?: string;
  LineTotal?: number;
  LineNum?: number;
  RemainingOpenQuantity?: number;
  OpenQty?: number;
  OpenQuantity?: number;
}

export interface PurchaseQuotationDetail {
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
  DocTotal?: number | string;
  DocumentLines?: PurchaseQuotationDetailLine[];
  attachments?: any[];
}
export interface PurchaseQuotationDetailResponse {
  success: boolean;
  data: PurchaseQuotationDetail;
}

export interface OpenPurchaseQuotationLine {
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

export interface OpenPurchaseQuotationLinesResponse {
  success: boolean;
  data: OpenPurchaseQuotationLine[];
}

export const purchaseQuotationAPI = {
  createPurchaseQuotation: async (payload: CreatePurchaseQuotationPayload) =>
    apiClient<unknown>("/api/v1/purchase-quotations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getOpenPurchaseQuotationLines: async (cardCode: string) =>
    apiClient<OpenPurchaseQuotationLinesResponse>(
      `/api/v1/purchase-quotations/open-lines?cardCode=${cardCode}`,
    ),
  getPurchaseQuotationByDocNum: async (docNum: string | number, draftDocEntry?: string) => {
    const query = draftDocEntry ? `?draftDocEntry=${draftDocEntry}` : "";
    return apiClient<PurchaseQuotationDetailResponse>(
      `/api/v1/purchase-quotations/by-doc-num/${docNum}${query}`,
    );
  },
  getPurchaseQuotationDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/purchase-quotations/docnums?${query}`
      : "/api/v1/purchase-quotations/docnums";
    return apiClient<PurchaseQuotationDocNumLookupResponse>(path);
  },
  getPurchaseQuotations: async (params: PurchaseQuotationListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/purchase-quotations?${query}` : "/api/v1/purchase-quotations";
    return apiClient<PurchaseQuotationListResponse>(path);
  },
  updatePurchaseQuotation: async (id: string | number, payload: UpdatePurchaseQuotationPayload) =>
    apiClient<unknown>(`/api/v1/purchase-quotations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
