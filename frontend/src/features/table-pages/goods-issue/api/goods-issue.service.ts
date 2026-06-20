import type { z } from "zod";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";
import type {
  goodsIssueListItemSchema,
  goodsIssueListParamsSchema,
  goodsIssueListResponseSchema,
} from "../schemas/goods-issue-api.schema";

export type GoodsIssueListItem = z.infer<typeof goodsIssueListItemSchema>;
export type GoodsIssueListParams = z.infer<typeof goodsIssueListParamsSchema>;
export type GoodsIssueListResponse = z.infer<typeof goodsIssueListResponseSchema>;

export interface GoodsIssueDocNumLookupItem {
  code: string;
  name: string;
}

export interface GoodsIssueDocNumLookupResponse {
  success: boolean;
  data: GoodsIssueDocNumLookupItem[];
}

export const goodsIssueAPI = {
  getGoodsIssues: async (params: GoodsIssueListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/goods-issues?${query}` : "/api/v1/goods-issues";
    return apiClient<GoodsIssueListResponse>(path);
  },
  getGoodsIssueById: async (id: string | number) => {
    return apiClient<{ success: boolean; data: any }>(`/api/v1/goods-issues/${id}`);
  },
  getGoodsIssueDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query ? `/api/v1/goods-issues/docnums?${query}` : "/api/v1/goods-issues/docnums";
    return apiClient<GoodsIssueDocNumLookupResponse>(path);
  },
};
