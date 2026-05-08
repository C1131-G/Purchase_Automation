/** Master Data Service: API interaction for foundational ERP entities (Items, Partners, Tax). */
import type { MasterDataResponse } from "@/features/create-pages/create-shared/api/create-shared.types";
import { apiClient } from "@/shared/api/client";

interface MasterDataItem {
  Code: string;
  Name: string;
}

interface MasterDataQuery {
  search?: string;
  limit?: number;
  warehouseCode?: string;
  itemCode?: string;
  type?: "sales" | "purchase";
}

export const masterDataAPI = {
  getCustomers: async (params?: MasterDataQuery) => {
    const query = new URLSearchParams();
    if (params?.search) {
      query.set("search", params.search);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/customers?${query.toString()}`,
    );
  },
  getProductWarehouseStocks: async (itemCode: string) => {
    const query = new URLSearchParams();
    if (itemCode.trim()) {
      query.set("itemCode", itemCode.trim());
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/product-warehouse-stocks?${query.toString()}`,
    );
  },
  getProducts: async (params?: MasterDataQuery) => {
    const query = new URLSearchParams();
    if (params?.search) {
      query.set("search", params.search);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    if (params?.warehouseCode) {
      query.set("warehouseCode", params.warehouseCode);
    }
    if (params?.type) {
      query.set("type", params.type);
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/products?${query.toString()}`,
    );
  },
  getTaxCodes: async () =>
    apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      "/api/v1/master-data/TaxDeclarations",
    ),
  getVendors: async (params?: MasterDataQuery) => {
    const query = new URLSearchParams();
    if (params?.search) {
      query.set("search", params.search);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/vendors?${query.toString()}`,
    );
  },
  getWarehouses: async (params?: MasterDataQuery) => {
    const query = new URLSearchParams();
    if (params?.search) {
      query.set("search", params.search);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/warehouses?${query.toString()}`,
    );
  },
};
