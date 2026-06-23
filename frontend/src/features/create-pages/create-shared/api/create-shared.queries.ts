/** Create Shared Queries: TanStack Query keys and options for universal master data. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
  mapLookup,
  mapProductLookup,
  mapProductWarehouseStock,
  mapSalesEmployeeLookup,
  mapVendorLookup,
  normalizeLookups,
  unwrapMasterData,
} from "@/features/create-pages/create-shared/api/create-shared.mapper";
import type {
  MasterDataResponse,
  ProductWarehouseStockItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import { masterDataAPI } from "@/features/create-pages/create-shared/api/master-data.service";
import { apiClient } from "@/shared/api/client";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

const fetchVendorsFromMasterDataRoute = async () =>
  apiClient<MasterDataResponse<Record<string, unknown>>>("/api/v1/master-data/vendors");

const fetchCustomersFromMasterDataRoute = async () =>
  apiClient<MasterDataResponse<Record<string, unknown>>>("/api/v1/master-data/customers");

const fetchSalesEmployees = async () =>
  apiClient<MasterDataResponse<Record<string, unknown>>>("/api/v1/sales-orders/SalesEmployee");

export const createSharedKeys = {
  all: ["create-shared"] as const,
  customers: () => [...createSharedKeys.all, "customers-v3"] as const,
  productWarehouseStocks: () => [...createSharedKeys.all, "product-warehouse-stocks"] as const,
  products: () => [...createSharedKeys.all, "products-v2"] as const,
  salesEmployees: () => [...createSharedKeys.all, "sales-employees"] as const,
  taxCodes: () => [...createSharedKeys.all, "tax-codes"] as const,
  uoms: () => [...createSharedKeys.all, "uoms"] as const,
  vendors: () => [...createSharedKeys.all, "vendors-v3"] as const,
  warehouses: () => [...createSharedKeys.all, "warehouses"] as const,
  financialPeriod: () => [...createSharedKeys.all, "financial-period-active"] as const,
};

export const createSharedQueries = {
  financialPeriod: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        const response = await apiClient<{
          data: {
            AbsEntry: number;
            F_RefDate: string;
            T_RefDate: string;
            LinkAct_1?: string;
            LinkAct_2?: string;
            LinkAct_3?: string;
            LinkAct_12?: string;
          } | null;
          success: boolean;
        }>("/api/v1/financial-period/active");
        return response.data;
      },
      queryKey: createSharedKeys.financialPeriod(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  customers: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () =>
        normalizeLookups((await fetchCustomersFromMasterDataRoute()).data.map(mapVendorLookup)),
      queryKey: createSharedKeys.customers(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  productWarehouseStocks: (itemCode?: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      queryFn: async () => {
        if (!itemCode?.trim()) return [] as ProductWarehouseStockItem[];
        return unwrapMasterData(await masterDataAPI.getProductWarehouseStocks(itemCode))
          .map(mapProductWarehouseStock)
          .filter((item) => item.code.trim());
      },
      queryKey: [...createSharedKeys.productWarehouseStocks(), itemCode ?? ""],
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    }),
  products: (
    warehouseCode?: string,
    search?: string,
    limit?: number,
    type?: "sales" | "purchase",
  ) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      placeholderData: keepPreviousData,
      queryFn: async () => {
        const params: {
          warehouseCode?: string;
          search?: string;
          limit?: number;
          type?: "sales" | "purchase";
        } = {};
        if (warehouseCode) params.warehouseCode = warehouseCode;
        if (search) params.search = search;
        if (typeof limit === "number") params.limit = limit;
        if (type) params.type = type;

        return unwrapMasterData(await masterDataAPI.getProducts(params))
          .map(mapProductLookup)
          .filter((item) => item.code.trim() && item.name.trim());
      },
      queryKey: [
        ...createSharedKeys.products(),
        warehouseCode ?? "",
        search ?? "",
        limit,
        type ?? "default",
      ],
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    }),
  salesEmployees: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () =>
        normalizeLookups((await fetchSalesEmployees()).data.map(mapSalesEmployeeLookup)),
      queryKey: createSharedKeys.salesEmployees(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  taxCodes: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () =>
        normalizeLookups(unwrapMasterData(await masterDataAPI.getTaxCodes()).map(mapLookup)),
      queryKey: createSharedKeys.taxCodes(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  uoms: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        const uomList = unwrapMasterData(await masterDataAPI.getUoms()).map((item) => {
          const base = mapLookup(item);
          const rawRecord =
            item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return {
            ...base,
            uomEntry: typeof rawRecord.uomEntry === "number" ? rawRecord.uomEntry : undefined,
          };
        });
        return normalizeLookups(uomList);
      },
      queryKey: createSharedKeys.uoms(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  vendors: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () =>
        normalizeLookups((await fetchVendorsFromMasterDataRoute()).data.map(mapVendorLookup)),
      queryKey: createSharedKeys.vendors(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  warehouses: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () =>
        normalizeLookups(unwrapMasterData(await masterDataAPI.getWarehouses()).map(mapLookup)),
      queryKey: createSharedKeys.warehouses(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
};
