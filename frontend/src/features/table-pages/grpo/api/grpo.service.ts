/** GRPO Service: Direct API interaction for receipt business logic. */
import type { z } from "zod";

import type {
  grpoListItemSchema,
  grpoListParamsSchema,
  grpoListResponseSchema,
} from "@/features/table-pages/grpo/schemas/grpo-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type GRPOStatus = z.infer<typeof grpoListItemSchema>["DocStatus"];

export type GRPOListItem = z.infer<typeof grpoListItemSchema>;

export type GRPOListParams = z.infer<typeof grpoListParamsSchema>;

export type GRPOListResponse = z.infer<typeof grpoListResponseSchema>;
export interface GRPODocNumLookupItem {
  code: string;
  name: string;
}
export interface GRPODocNumLookupResponse {
  success: boolean;
  data: GRPODocNumLookupItem[];
}
export interface AvailablePOItem {
  id: number;
  purchaseOrderNo: string;
  poDate?: string;
  vendorCode?: string;
  vendorName?: string;
  vendorRefNumber?: string;
  total?: number;
}
export interface AvailablePOResponse {
  success: boolean;
  data: AvailablePOItem[];
}

export interface GRPOCreatePODetailLine {
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  UoMCode?: string | number;
  UoMEntry?: number;
  Price?: number;
  WarehouseCode?: string;
  TaxCode?: string;
  VatGroup?: string;
  VatPrcnt?: number;
  BaseEntry?: number;
  BaseLine?: number;
  BaseType?: number;
}

export interface GRPOCreatePODetail {
  id?: number;
  DocEntry?: number;
  DocNum?: number;
  Series?: number;
  DocDate?: string;
  DocDueDate?: string;
  CardCode?: string;
  CardName?: string;
  Address?: string;
  Address2?: string;
  NumAtCard?: string;
  DocTotal?: number;
  DocumentLines?: GRPOCreatePODetailLine[];
}
export interface GRPOCreatePODetailResponse {
  success: boolean;
  data: GRPOCreatePODetail;
}
export type CreateGRPOPayload = Record<string, unknown>;
export type UpdateGRPOPayload = Record<string, unknown>;
export interface CreateGRPOResponse {
  success: boolean;
  data: { DocEntry: number; DocNum: number };
}

export interface GRPODetailLine {
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  OpenQty?: number;
  Price?: number;
  UnitPrice?: number;
  DiscountPercent?: number;
  UoMCode?: string | number;
  UoMEntry?: number;
  WarehouseCode?: string;
  TaxCode?: string;
  VatGroup?: string;
  VatPrcnt?: number;
  LineTotal?: number;
  BaseEntry?: number;
  BaseLine?: number;
  BaseType?: number;
  LineNum?: number;
  BatchNumbers?: Array<Record<string, unknown>>;
  SerialNumbers?: Array<Record<string, unknown>>;
  DocumentLinesBinAllocations?: Array<Record<string, unknown>>;
}

export interface GRPODetail {
  id?: number;
  DocEntry?: number;
  DocNum?: number;
  Series?: number;
  DocDate?: string;
  DocDueDate?: string;
  SalesPersonCode?: string | number;
  CardCode?: string;
  CardName?: string;
  Address?: string;
  Address2?: string;
  Comments?: string;
  NumAtCard?: string;
  DocTotal?: number;
  DocCurr?: string;
  DocStatus?: "Open" | "Partial" | "Closed" | "O" | "C" | "Draft" | "bost_Open" | "bost_Close";
  DocumentLines?: GRPODetailLine[];
  attachments?: any[];
}

export interface GRPODetailResponse {
  success: boolean;
  data: GRPODetail;
}

export const grpoAPI = {
  createGRPO: async (payload: CreateGRPOPayload) =>
    apiClient<CreateGRPOResponse>("/api/v1/grpos", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAvailablePOs: async (vendorCode: string) => {
    const query = toQueryString({ vendorCode });
    const path = `/api/v1/grpos/available-pos?${query}`;
    return apiClient<AvailablePOResponse>(path);
  },
  getGRPOById: async (id: string | number, draftDocEntry?: string) => {
    const query = draftDocEntry ? `?draftDocEntry=${draftDocEntry}` : "";
    return apiClient<GRPODetailResponse>(`/api/v1/grpos/${id}${query}`);
  },
  getGRPODocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query ? `/api/v1/grpos/docnums?${query}` : "/api/v1/grpos/docnums";
    return apiClient<GRPODocNumLookupResponse>(path);
  },
  getGRPOs: async (params: GRPOListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/grpos?${query}` : "/api/v1/grpos";
    return apiClient<GRPOListResponse>(path);
  },
  getPODetailForGRPO: async (id: string | number) =>
    apiClient<GRPOCreatePODetailResponse>(`/api/v1/grpos/po-detail/${id}`),
  updateGRPO: async (id: string | number, payload: UpdateGRPOPayload) =>
    apiClient<unknown>(`/api/v1/grpos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
