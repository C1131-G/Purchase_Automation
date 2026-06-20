import type { z } from "zod";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";
import type {
  transferRequestListItemSchema,
  transferRequestListParamsSchema,
  transferRequestListResponseSchema,
} from "../schemas/transfer-request-api.schema";

export type TransferRequestListItem = z.infer<typeof transferRequestListItemSchema>;
export type TransferRequestListParams = z.infer<typeof transferRequestListParamsSchema>;
export type TransferRequestListResponse = z.infer<typeof transferRequestListResponseSchema>;

export interface TransferRequestDocNumLookupItem {
  code: string;
  name: string;
}
export interface TransferRequestDocNumLookupResponse {
  success: boolean;
  data: TransferRequestDocNumLookupItem[];
}

export const transferRequestAPI = {
  getTransferRequests: async (params: TransferRequestListParams) => {
    const query = toQueryString(params);
    const path = query
      ? `/api/v1/inventory-transfer-requests?${query}`
      : "/api/v1/inventory-transfer-requests";
    return apiClient<TransferRequestListResponse>(path);
  },
  getTransferRequestById: async (id: string | number) => {
    return apiClient<{ success: boolean; data: any }>(`/api/v1/inventory-transfer-requests/${id}`);
  },
  getTransferRequestDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/inventory-transfer-requests/docnums?${query}`
      : "/api/v1/inventory-transfer-requests/docnums";
    return apiClient<TransferRequestDocNumLookupResponse>(path);
  },
};
