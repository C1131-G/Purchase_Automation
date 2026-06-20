import type { z } from "zod";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";
import type {
  itemMasterListItemSchema,
  itemMasterListParamsSchema,
  itemMasterListResponseSchema,
} from "../schemas/item-master-api.schema";

export type ItemMasterListItem = z.infer<typeof itemMasterListItemSchema>;
export type ItemMasterListParams = z.infer<typeof itemMasterListParamsSchema>;
export type ItemMasterListResponse = z.infer<typeof itemMasterListResponseSchema>;

export const itemMasterAPI = {
  getItems: async (params: ItemMasterListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/items?${query}` : "/api/v1/items";
    return apiClient<ItemMasterListResponse>(path);
  },
  getItemById: async (id: string | number) => {
    return apiClient<{ success: boolean; data: ItemMasterListItem }>(`/api/v1/items/${id}`);
  },
  getItemCodes: async (params?: { search?: string | undefined; limit?: number | undefined }) => {
    const query = toQueryString(params || {});
    const path = query ? `/api/v1/items/itemcodes?${query}` : "/api/v1/items/itemcodes";
    return apiClient<{ success: boolean; data: { code: string; name: string }[] }>(path);
  },
  getItemNames: async (params?: { search?: string | undefined; limit?: number | undefined }) => {
    const query = toQueryString(params || {});
    const path = query ? `/api/v1/items/itemnames?${query}` : "/api/v1/items/itemnames";
    return apiClient<{ success: boolean; data: { code: string; name: string }[] }>(path);
  },
  getItemGroups: async (params?: { search?: string | undefined; limit?: number | undefined }) => {
    const query = toQueryString(params || {});
    const path = query ? `/api/v1/items/groups?${query}` : "/api/v1/items/groups";
    return apiClient<{ success: boolean; data: { code: string; name: string }[] }>(path);
  },
  getItemUOMs: async (params?: { search?: string | undefined; limit?: number | undefined }) => {
    const query = toQueryString(params || {});
    const path = query ? `/api/v1/items/uoms?${query}` : "/api/v1/items/uoms";
    return apiClient<{ success: boolean; data: { code: string; name: string }[] }>(path);
  },
  getItemBarCodes: async (params?: { search?: string | undefined; limit?: number | undefined }) => {
    const query = toQueryString(params || {});
    const path = query ? `/api/v1/items/barcodes?${query}` : "/api/v1/items/barcodes";
    return apiClient<{ success: boolean; data: { code: string; name: string }[] }>(path);
  },
};
