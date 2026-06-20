import type { z } from "zod";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";
import type {
  goodsReceiptListItemSchema,
  goodsReceiptListParamsSchema,
  goodsReceiptListResponseSchema,
} from "../schemas/goods-receipt-api.schema";

export type GoodsReceiptListItem = z.infer<typeof goodsReceiptListItemSchema>;
export type GoodsReceiptListParams = z.infer<typeof goodsReceiptListParamsSchema>;
export type GoodsReceiptListResponse = z.infer<typeof goodsReceiptListResponseSchema>;
export interface GoodsReceiptDocNumLookupItem {
  code: string;
  name: string;
}
export interface GoodsReceiptDocNumLookupResponse {
  success: boolean;
  data: GoodsReceiptDocNumLookupItem[];
}

export const goodsReceiptAPI = {
  getGoodsReceipts: async (params: GoodsReceiptListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/goods-receipts?${query}` : "/api/v1/goods-receipts";
    return apiClient<GoodsReceiptListResponse>(path);
  },
  getGoodsReceiptById: async (id: string | number) => {
    return apiClient<{ success: boolean; data: any }>(`/api/v1/goods-receipts/${id}`);
  },
  getGoodsReceiptDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/goods-receipts/docnums?${query}`
      : "/api/v1/goods-receipts/docnums";
    return apiClient<GoodsReceiptDocNumLookupResponse>(path);
  },
};
