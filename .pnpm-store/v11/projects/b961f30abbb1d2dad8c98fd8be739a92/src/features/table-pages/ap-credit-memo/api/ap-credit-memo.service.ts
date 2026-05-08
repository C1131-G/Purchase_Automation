/** AP Credit Memo Service: Direct API interaction for credit memo business logic. */
import type { z } from "zod";

import type {
  apCreditMemoListItemSchema,
  apCreditMemoListParamsSchema,
  apCreditMemoListResponseSchema,
} from "@/features/table-pages/ap-credit-memo/schemas/ap-credit-memo-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type APCreditMemoStatus = z.infer<typeof apCreditMemoListItemSchema>["DocStatus"];

export type APCreditMemoListItem = z.infer<typeof apCreditMemoListItemSchema>;

export type APCreditMemoListParams = z.infer<typeof apCreditMemoListParamsSchema>;

export type APCreditMemoListResponse = z.infer<typeof apCreditMemoListResponseSchema>;
export interface APCreditMemoDocNumLookupItem {
  code: string;
  name: string;
}
export interface APCreditMemoDocNumLookupResponse {
  success: boolean;
  data: APCreditMemoDocNumLookupItem[];
}

export interface APCreditMemoDetailResponse {
  success: boolean;
  data: {
    id?: number;
    DocEntry?: number;
    DocNum?: number;
    DocDate?: string;
    CardCode?: string;
    CardName?: string;
    DocTotal?: number;
    DocCurr?: string;
    DocStatus?: string;
    Comments?: string;
    DocDueDate?: string;
    SalesPersonCode?: number;
    Address?: string;
    Address2?: string;
    DocumentLines?: Record<string, unknown>[];
  };
}

export const apCreditMemoAPI = {
  getAPCreditMemo: async (docNum: string) =>
    apiClient<APCreditMemoDetailResponse>(`/api/v1/ap-credit-memos/${docNum}`),
  getAPCreditMemoDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/ap-credit-memos/docnums?${query}`
      : "/api/v1/ap-credit-memos/docnums";
    return apiClient<APCreditMemoDocNumLookupResponse>(path);
  },
  getAPCreditMemos: async (params: APCreditMemoListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/ap-credit-memos?${query}` : "/api/v1/ap-credit-memos";
    return apiClient<APCreditMemoListResponse>(path);
  },
};
