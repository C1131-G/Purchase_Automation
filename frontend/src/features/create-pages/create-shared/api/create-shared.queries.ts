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
  priceLists: () => [...createSharedKeys.all, "price-lists"] as const,
  productWarehouseStocks: () => [...createSharedKeys.all, "product-warehouse-stocks"] as const,
  products: () => [...createSharedKeys.all, "products-v2"] as const,
  salesEmployees: () => [...createSharedKeys.all, "sales-employees"] as const,
  taxCodes: () => [...createSharedKeys.all, "tax-codes"] as const,
  uoms: () => [...createSharedKeys.all, "uoms"] as const,
  vendors: () => [...createSharedKeys.all, "vendors-v3"] as const,
  warehouses: () => [...createSharedKeys.all, "warehouses"] as const,
  series: (documentType: string) => [...createSharedKeys.all, "series", documentType] as const,
  warehouseBins: (warehouseCode: string) =>
    [...createSharedKeys.all, "warehouse-bins", warehouseCode] as const,
  branches: () => [...createSharedKeys.all, "branches"] as const,
  inventoryAdjustmentReasons: (type: "receipt" | "issue" = "receipt") => [...createSharedKeys.all, "inventory-adjustment-reasons", type] as const,
};

export const createSharedQueries = {
  priceLists: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () =>
        normalizeLookups(unwrapMasterData(await masterDataAPI.getPriceLists()).map(mapLookup)),
      queryKey: createSharedKeys.priceLists(),
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
    priceList?: string,
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
          priceList?: string;
        } = {};
        if (warehouseCode) params.warehouseCode = warehouseCode;
        if (search) params.search = search;
        if (typeof limit === "number") params.limit = limit;
        if (type) params.type = type;
        if (priceList !== undefined && priceList !== "") params.priceList = priceList;

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
        priceList ?? "default",
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
        normalizeLookups(
          unwrapMasterData(await masterDataAPI.getWarehouses()).map((w: any) => ({
            ...mapLookup(w),
            enableBinLocations: w.enableBinLocations,
          })),
        ),
      queryKey: createSharedKeys.warehouses(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  series: (documentType: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        const response = await masterDataAPI.getSeries(documentType);
        return normalizeLookups(unwrapMasterData(response).map(mapLookup));
      },
      queryKey: createSharedKeys.series(documentType),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  warehouseBins: (warehouseCode: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        const response = await masterDataAPI.getWarehouseBins(warehouseCode);
        const data = unwrapMasterData(response);
        return normalizeLookups(
          data.map((item: any) => ({
            code: String(item.AbsEntry),
            name: item.BinCode,
          })),
        );
      },
      queryKey: createSharedKeys.warehouseBins(warehouseCode),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  branches: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        const response = await masterDataAPI.getBranches();
        if ("data" in response) {
          return (response.data as { Code: string; Name: string }[]).map((i) => ({
            code: i.Code,
            name: i.Name,
          }));
        }
        return (response as { Code: string; Name: string }[]).map((i) => ({
          code: i.Code,
          name: i.Name,
        }));
      },
      queryKey: createSharedKeys.branches(),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  inventoryAdjustmentReasons: (type: "receipt" | "issue" = "receipt") =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () =>
        normalizeLookups(unwrapMasterData(await masterDataAPI.getInventoryAdjustmentReasons(type)).map(mapLookup)),
      queryKey: createSharedKeys.inventoryAdjustmentReasons(type),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
};
