/** Create Shared Queries: TanStack Query keys and options for universal master data. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
  mapLookup,
  mapSeriesLookup,
  mapProductLookup,
  mapProductWarehouseStock,
  mapSalesEmployeeLookup,
  mapVendorLookup,
  normalizeLookups,
  unwrapMasterData,
} from "@/features/create-pages/create-shared/api/create-shared.mapper";
import type {
  ItemBatchLookup,
  ItemSerialLookup,
  MasterDataResponse,
  ProductLookupItem,
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
  apiClient<MasterDataResponse<Record<string, unknown>>>("/api/v1/sales-quotations/SalesEmployee");

export const createSharedKeys = {
  all: ["create-shared"] as const,
  // v4: list payload omits addresses[]; use businessPartnerAddresses for pickers.
  customers: () => [...createSharedKeys.all, "customers-v4"] as const,
  businessPartnerAddresses: (cardCode: string) =>
    [...createSharedKeys.all, "business-partner-addresses", cardCode] as const,
  priceLists: () => [...createSharedKeys.all, "price-lists"] as const,
  productWarehouseStocks: () => [...createSharedKeys.all, "product-warehouse-stocks"] as const,
  productWarehouseStocksBatch: () =>
    [...createSharedKeys.all, "product-warehouse-stocks-batch"] as const,
  products: () => [...createSharedKeys.all, "products-v2"] as const,
  productsByCodes: () => [...createSharedKeys.all, "products-by-codes"] as const,
  salesEmployees: () => [...createSharedKeys.all, "sales-employees"] as const,
  taxCodes: () => [...createSharedKeys.all, "tax-codes"] as const,
  uoms: () => [...createSharedKeys.all, "uoms"] as const,
  vendors: () => [...createSharedKeys.all, "vendors-v4"] as const,
  warehouses: () => [...createSharedKeys.all, "warehouses"] as const,
  series: (documentType: string) =>
    [...createSharedKeys.all, "series", documentType, "v2"] as const,
  warehouseBins: (warehouseCode: string) =>
    [...createSharedKeys.all, "warehouse-bins", warehouseCode] as const,
  branches: () => [...createSharedKeys.all, "branches"] as const,
  itemBatches: (itemCode: string, warehouseCode: string) =>
    [...createSharedKeys.all, "item-batches", itemCode, warehouseCode] as const,
  itemSerials: (itemCode: string, warehouseCode: string) =>
    [...createSharedKeys.all, "item-serials", itemCode, warehouseCode] as const,
  itemDefaultBin: (itemCode: string, warehouseCode: string) =>
    [...createSharedKeys.all, "item-default-bin", itemCode, warehouseCode] as const,
};

/** Stable key segment for batch codes (order-independent). */
const batchCodesKey = (codes: string[]) =>
  [...new Set(codes.map((code) => code.trim()).filter(Boolean))].sort().join(",");

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
  /**
   * Lazy address list for one vendor/customer (bill/ship pickers).
   * List endpoints only return default billTo/shipTo strings.
   */
  businessPartnerAddresses: (cardCode?: string) => {
    const code = cardCode?.trim() ?? "";
    return queryOptions({
      enabled: Boolean(code),
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        if (!code) {
          return {
            addresses: [] as Array<{
              addressName: string;
              addressType: "B" | "S";
              addressText: string;
            }>,
            billToAddress: "",
            cardCode: "",
            shipToAddress: "",
          };
        }
        const response = await masterDataAPI.getBusinessPartnerAddresses(code);
        const data =
          response && typeof response === "object" && "data" in response
            ? (response as { data: Record<string, unknown> }).data
            : (response as Record<string, unknown>);
        const record = data && typeof data === "object" ? data : {};
        const rawAddresses = Array.isArray(record.addresses) ? record.addresses : [];
        const addresses = rawAddresses
          .map((addr) => {
            const r = addr && typeof addr === "object" ? (addr as Record<string, unknown>) : {};
            const addressTypeRaw = String(r.addressType ?? r.AddressType ?? "B")
              .trim()
              .toUpperCase();
            const addressType = addressTypeRaw === "S" ? ("S" as const) : ("B" as const);
            return {
              addressName: String(r.addressName ?? r.AddressName ?? "").trim(),
              addressType,
              addressText: String(r.addressText ?? r.AddressText ?? "").trim(),
            };
          })
          .filter((addr) => addr.addressText);
        return {
          addresses,
          billToAddress: String(record.billToAddress ?? "").trim(),
          cardCode: String(record.cardCode ?? code).trim(),
          shipToAddress: String(record.shipToAddress ?? "").trim(),
        };
      },
      queryKey: createSharedKeys.businessPartnerAddresses(code),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    });
  },
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
  /**
   * Batch stocks for many item codes (edit hydrate). Flat rows include itemCode.
   * Prefer over N× productWarehouseStocks on the hydrate path.
   */
  productWarehouseStocksBatch: (itemCodes: string[], warehouseCode?: string) => {
    const normalizedCodes = [
      ...new Set(itemCodes.map((code) => String(code).trim()).filter(Boolean)),
    ];
    const codesKey = batchCodesKey(normalizedCodes);
    const whKey = warehouseCode?.trim() ?? "";
    return queryOptions({
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      queryFn: async () => {
        if (normalizedCodes.length === 0) {
          return [] as Array<ProductWarehouseStockItem & { itemCode: string }>;
        }
        const raw = unwrapMasterData(
          await masterDataAPI.getProductWarehouseStocksBatch({
            itemCodes: normalizedCodes,
            ...(whKey ? { warehouseCode: whKey } : {}),
          }),
        );
        return raw
          .map((row) => {
            const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
            const mapped = mapProductWarehouseStock(row);
            return {
              ...mapped,
              itemCode: String(record.itemCode ?? record.ItemCode ?? "").trim(),
            };
          })
          .filter((item) => item.itemCode && item.code.trim());
      },
      queryKey: [...createSharedKeys.productWarehouseStocksBatch(), codesKey, whKey],
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    });
  },
  /**
   * Batch product meta by exact codes (edit / copy-from hydrate).
   * Seeds the same shape as products() search results.
   */
  productsByCodes: (
    codes: string[],
    type?: "sales" | "purchase",
    priceList?: string,
    warehouseCode?: string,
    cardCode?: string,
  ) => {
    const normalizedCodes = [...new Set(codes.map((code) => String(code).trim()).filter(Boolean))];
    const codesKey = batchCodesKey(normalizedCodes);
    const partnerCode = cardCode?.trim() || "";
    return queryOptions({
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      queryFn: async () => {
        if (normalizedCodes.length === 0 || !partnerCode) {
          return [] as ProductLookupItem[];
        }
        return unwrapMasterData(
          await masterDataAPI.getProductsByCodes({
            codes: normalizedCodes,
            cardCode: partnerCode,
            ...(type ? { type } : {}),
            ...(priceList !== undefined && priceList !== "" ? { priceList } : {}),
            ...(warehouseCode ? { warehouseCode } : {}),
          }),
        )
          .map(mapProductLookup)
          .filter((item) => item.code.trim() && item.name.trim());
      },
      queryKey: [
        ...createSharedKeys.productsByCodes(),
        codesKey,
        type ?? "default",
        priceList ?? "default",
        warehouseCode ?? "",
        partnerCode,
      ],
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    });
  },
  products: (
    warehouseCode?: string,
    search?: string,
    limit?: number,
    type?: "sales" | "purchase",
    priceList?: string,
    cardCode?: string,
  ) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      placeholderData: keepPreviousData,
      queryFn: async () => {
        const partnerCode = cardCode?.trim() || "";
        // Strict: no BP → no product list (do not load full item master).
        if (!partnerCode) {
          return [] as ProductLookupItem[];
        }
        const params: {
          warehouseCode?: string;
          search?: string;
          limit?: number;
          type?: "sales" | "purchase";
          priceList?: string;
          cardCode?: string;
        } = { cardCode: partnerCode };
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
        cardCode?.trim() || "",
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
          unwrapMasterData(await masterDataAPI.getWarehouses()).map((w: unknown) => {
            const record = w && typeof w === "object" ? (w as Record<string, unknown>) : {};
            return {
              ...mapLookup(w),
              enableBinLocations: Boolean(record.enableBinLocations),
            };
          }),
        ),
      // v2: warehouses include branchId (OWHS.BPLid)
      queryKey: [...createSharedKeys.warehouses(), "v2"] as const,
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  series: (documentType: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        const response = await masterDataAPI.getSeries(documentType);
        return normalizeLookups(unwrapMasterData(response).map(mapSeriesLookup));
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
          data.map((item: unknown) => {
            const record =
              item && typeof item === "object" ? (item as Record<string, unknown>) : {};
            return {
              code: String(record.AbsEntry ?? ""),
              name: String(record.BinCode ?? ""),
            };
          }),
        );
      },
      queryKey: createSharedKeys.warehouseBins(warehouseCode),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  /** SAP business places (OBPL) — document BPLId, not distribution rules. */
  branches: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
      queryFn: async () => {
        const response = await masterDataAPI.getBranches();
        const rows = unwrapMasterData(response);
        return normalizeLookups(
          rows.map((item: unknown) => {
            const mapped = mapLookup(item);
            const record =
              item && typeof item === "object" ? (item as Record<string, unknown>) : {};
            const branchId =
              mapped.branchId ??
              (Number.isFinite(Number(record.BPLId ?? record.branchId ?? mapped.code))
                ? Math.trunc(Number(record.BPLId ?? record.branchId ?? mapped.code))
                : null);
            return {
              ...mapped,
              branchId: branchId != null && branchId > 0 ? branchId : mapped.branchId,
            };
          }),
        );
      },
      queryKey: [...createSharedKeys.branches(), "obpl-v1"] as const,
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
    }),
  itemBatches: (itemCode?: string, warehouseCode?: string) => {
    const item = itemCode?.trim() ?? "";
    const warehouse = warehouseCode?.trim() ?? "";
    return queryOptions({
      enabled: Boolean(item && warehouse),
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      queryFn: async (): Promise<ItemBatchLookup[]> => {
        if (!item || !warehouse) {
          return [];
        }
        return unwrapMasterData(await masterDataAPI.getItemBatches(item, warehouse))
          .map((row) => {
            const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
            return {
              admissionDate: String(record.admissionDate ?? record.AdmissionDate ?? "").trim(),
              batchNumber: String(record.batchNumber ?? record.BatchNumber ?? "").trim(),
              expiryDate: String(record.expiryDate ?? record.ExpiryDate ?? "").trim(),
              manufacturingDate: String(
                record.manufacturingDate ?? record.ManufacturingDate ?? "",
              ).trim(),
              notes: String(record.notes ?? record.Notes ?? "").trim(),
              quantity: Number(record.quantity ?? record.Quantity ?? 0) || 0,
            };
          })
          .filter((row) => row.batchNumber);
      },
      queryKey: createSharedKeys.itemBatches(item, warehouse),
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    });
  },
  itemSerials: (itemCode?: string, warehouseCode?: string) => {
    const item = itemCode?.trim() ?? "";
    const warehouse = warehouseCode?.trim() ?? "";
    return queryOptions({
      enabled: Boolean(item && warehouse),
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      queryFn: async (): Promise<ItemSerialLookup[]> => {
        if (!item || !warehouse) {
          return [];
        }
        return unwrapMasterData(await masterDataAPI.getItemSerials(item, warehouse))
          .map((row) => {
            const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
            return {
              expiryDate: String(record.expiryDate ?? record.ExpiryDate ?? "").trim(),
              internalSerialNumber: String(
                record.internalSerialNumber ?? record.InternalSerialNumber ?? "",
              ).trim(),
              manufacturerSerialNumber: String(
                record.manufacturerSerialNumber ?? record.ManufacturerSerialNumber ?? "",
              ).trim(),
              manufacturingDate: String(
                record.manufacturingDate ?? record.ManufacturingDate ?? "",
              ).trim(),
            };
          })
          .filter((row) => row.internalSerialNumber);
      },
      queryKey: createSharedKeys.itemSerials(item, warehouse),
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    });
  },
  itemDefaultBin: (itemCode?: string, warehouseCode?: string) => {
    const item = itemCode?.trim() ?? "";
    const warehouse = warehouseCode?.trim() ?? "";
    return queryOptions({
      enabled: Boolean(item && warehouse),
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      queryFn: async () => {
        if (!item || !warehouse) {
          return null;
        }
        const response = await masterDataAPI.getItemDefaultBin(item, warehouse);
        const data = response?.data;
        if (!data || typeof data !== "object") {
          return null;
        }
        const binAbsEntry = Number(data.binAbsEntry);
        const binCode = String(data.binCode ?? "").trim();
        if (!Number.isFinite(binAbsEntry) || binAbsEntry <= 0 || !binCode) {
          return null;
        }
        return { binAbsEntry: Math.trunc(binAbsEntry), binCode };
      },
      queryKey: createSharedKeys.itemDefaultBin(item, warehouse),
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
    });
  },
};
