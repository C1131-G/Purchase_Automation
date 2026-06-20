import type { z } from "zod";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";
import type {
  transferListItemSchema,
  transferListParamsSchema,
  transferListResponseSchema,
} from "../schemas/transfer-api.schema";

import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

export type TransferListItem = z.infer<typeof transferListItemSchema>;
export type TransferListParams = z.infer<typeof transferListParamsSchema>;
export type TransferListResponse = z.infer<typeof transferListResponseSchema>;

export const transferAPI = {
  getTransfers: async (params: TransferListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/inventory-transfers?${query}` : "/api/v1/inventory-transfers";
    return apiClient<TransferListResponse>(path);
  },
  getTransferById: async (id: string | number) => {
    return apiClient<{ success: boolean; data: any }>(`/api/v1/inventory-transfers/${id}`);
  },
  getTransferDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/inventory-transfers/docnums?${query}`
      : "/api/v1/inventory-transfers/docnums";
    return apiClient<{ data: LookupItem[]; success: boolean }>(path);
  },
};
