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
  /** Comma-separated or array of ItemCodes for batch hydrate endpoints. */
  codes?: string[] | string;
  itemCodes?: string[] | string;
  type?: "sales" | "purchase";
  priceList?: string; // price list code (e.g. "1", "-1", "-2")
  /** BP CardCode — scopes product list to OSCN ∩ OITM for that partner. */
  cardCode?: string;
}

const joinCodes = (codes: string[] | string | undefined): string => {
  if (Array.isArray(codes)) {
    return codes
      .map((code) => String(code).trim())
      .filter(Boolean)
      .join(",");
  }
  return typeof codes === "string" ? codes.trim() : "";
};

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
  /** Batch product meta by exact ItemCodes (document hydrate). Requires cardCode (OSCN). */
  getProductsByCodes: async (params: {
    codes: string[] | string;
    type?: "sales" | "purchase";
    priceList?: string;
    warehouseCode?: string;
    cardCode?: string;
  }) => {
    const query = new URLSearchParams();
    const codes = joinCodes(params.codes);
    if (codes) {
      query.set("codes", codes);
    }
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.priceList !== undefined && params.priceList !== "") {
      query.set("priceList", params.priceList);
    }
    if (params.warehouseCode) {
      query.set("warehouseCode", params.warehouseCode);
    }
    if (params.cardCode) {
      query.set("cardCode", params.cardCode);
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/products-by-codes?${query.toString()}`,
    );
  },
  /** Batch warehouse stock for many items (post-paint hydrate). */
  getProductWarehouseStocksBatch: async (params: {
    itemCodes: string[] | string;
    warehouseCode?: string;
  }) => {
    const query = new URLSearchParams();
    const itemCodes = joinCodes(params.itemCodes);
    if (itemCodes) {
      query.set("itemCodes", itemCodes);
    }
    if (params.warehouseCode) {
      query.set("warehouseCode", params.warehouseCode);
    }
    return apiClient<
      | MasterDataResponse<MasterDataItem & { itemCode?: string; stock?: number }>
      | Array<MasterDataItem & { itemCode?: string; stock?: number }>
    >(`/api/v1/master-data/product-warehouse-stocks-batch?${query.toString()}`);
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
    if (params?.priceList !== undefined && params.priceList !== "") {
      query.set("priceList", params.priceList);
    }
    if (params?.cardCode) {
      query.set("cardCode", params.cardCode);
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/products?${query.toString()}`,
    );
  },
  getTaxCodes: async () =>
    apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      "/api/v1/master-data/TaxDeclarations",
    ),
  getUoms: async (params?: MasterDataQuery) => {
    const query = new URLSearchParams();
    if (params?.search) {
      query.set("search", params.search);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    return apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/uoms?${query.toString()}`,
    );
  },
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
  /** Lazy full bill/ship address list for one CardCode (list endpoints omit addresses[]). */
  getBusinessPartnerAddresses: async (cardCode: string) => {
    const code = encodeURIComponent(cardCode.trim());
    return apiClient<{
      success: boolean;
      data: {
        cardCode: string;
        billToAddress: string;
        shipToAddress: string;
        addresses: Array<{
          addressName: string;
          addressType: "B" | "S";
          addressText: string;
        }>;
      };
    }>(`/api/v1/master-data/business-partners/${code}/addresses`);
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
  getPriceLists: async () =>
    apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      "/api/v1/master-data/price-lists",
    ),
  getSeries: async (documentType: string) =>
    apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/series?documentType=${documentType}`,
    ),
  getWarehouseBins: async (warehouseCode: string) =>
    apiClient<
      | MasterDataResponse<{ AbsEntry: number; BinCode: string }>
      | { AbsEntry: number; BinCode: string }[]
    >(`/api/v1/master-data/warehouses/${warehouseCode}/bins`),
  getBranches: async () =>
    apiClient<MasterDataResponse<MasterDataItem> | MasterDataItem[]>(
      `/api/v1/master-data/branches`,
    ),
  getItemBatches: async (itemCode: string, warehouseCode: string) => {
    const query = new URLSearchParams();
    if (itemCode.trim()) {
      query.set("itemCode", itemCode.trim());
    }
    if (warehouseCode.trim()) {
      query.set("warehouseCode", warehouseCode.trim());
    }
    return apiClient<MasterDataResponse<Record<string, unknown>> | Record<string, unknown>[]>(
      `/api/v1/master-data/item-batches?${query.toString()}`,
    );
  },
  getItemSerials: async (itemCode: string, warehouseCode: string) => {
    const query = new URLSearchParams();
    if (itemCode.trim()) {
      query.set("itemCode", itemCode.trim());
    }
    if (warehouseCode.trim()) {
      query.set("warehouseCode", warehouseCode.trim());
    }
    return apiClient<MasterDataResponse<Record<string, unknown>> | Record<string, unknown>[]>(
      `/api/v1/master-data/item-serials?${query.toString()}`,
    );
  },
};
