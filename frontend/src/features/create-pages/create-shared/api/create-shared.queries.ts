/** Create Shared Queries: TanStack Query keys and options for universal master data. */
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  mapLookup,
  mapProductLookup,
  mapProductWarehouseStock,
  mapSalesEmployeeLookup,
  mapVendorLookup,
  normalizeLookups,
  unwrapMasterData,
} from '@/features/create-pages/create-shared/api/create-shared.mapper'
import {
  type MasterDataResponse,
  type ProductWarehouseStockItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'
import { masterDataAPI } from '@/features/create-pages/create-shared/api/master-data.service'
import { apiClient } from '@/shared/api/client'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

const fetchVendorsFromMasterDataRoute = async () => {
  return apiClient<MasterDataResponse<Record<string, unknown>>>('/api/v1/master-data/vendors')
}

const fetchCustomersFromMasterDataRoute = async () => {
  return apiClient<MasterDataResponse<Record<string, unknown>>>('/api/v1/master-data/customers')
}

const fetchSalesEmployees = async () => {
  return apiClient<MasterDataResponse<Record<string, unknown>>>(
    '/api/v1/sales-orders/SalesEmployee',
  )
}

export const createSharedKeys = {
  all: ['create-shared'] as const,
  vendors: () => [...createSharedKeys.all, 'vendors-v2'] as const,
  customers: () => [...createSharedKeys.all, 'customers-v2'] as const,
  salesEmployees: () => [...createSharedKeys.all, 'sales-employees'] as const,
  products: () => [...createSharedKeys.all, 'products-v2'] as const,
  productWarehouseStocks: () => [...createSharedKeys.all, 'product-warehouse-stocks'] as const,
  warehouses: () => [...createSharedKeys.all, 'warehouses'] as const,
  taxCodes: () => [...createSharedKeys.all, 'tax-codes'] as const,
}

export const createSharedQueries = {
  vendors: () =>
    queryOptions({
      queryKey: createSharedKeys.vendors(),
      queryFn: async () =>
        normalizeLookups((await fetchVendorsFromMasterDataRoute()).data.map(mapVendorLookup)),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
    }),
  customers: () =>
    queryOptions({
      queryKey: createSharedKeys.customers(),
      queryFn: async () =>
        normalizeLookups((await fetchCustomersFromMasterDataRoute()).data.map(mapVendorLookup)),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
    }),
  products: (warehouseCode?: string, search?: string, limit?: number) =>
    queryOptions({
      queryKey: [...createSharedKeys.products(), warehouseCode ?? '', search ?? '', limit],
      queryFn: async () => {
        const params: { warehouseCode?: string; search?: string; limit?: number } = {}
        if (warehouseCode) params.warehouseCode = warehouseCode
        if (search) params.search = search
        if (typeof limit === 'number') params.limit = limit

        return unwrapMasterData(await masterDataAPI.getProducts(params))
          .map(mapProductLookup)
          .filter((item) => item.code.trim() && item.name.trim())
      },
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
      placeholderData: keepPreviousData,
    }),
  productWarehouseStocks: (itemCode?: string) =>
    queryOptions({
      queryKey: [...createSharedKeys.productWarehouseStocks(), itemCode ?? ''],
      queryFn: async () => {
        if (!itemCode?.trim()) return [] as ProductWarehouseStockItem[]
        return unwrapMasterData(await masterDataAPI.getProductWarehouseStocks(itemCode))
          .map(mapProductWarehouseStock)
          .filter((item) => item.code.trim())
      },
      staleTime: QUERY_CACHE_POLICY.createDynamicLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createDynamicLookup.gcTime,
    }),
  warehouses: () =>
    queryOptions({
      queryKey: createSharedKeys.warehouses(),
      queryFn: async () =>
        normalizeLookups(unwrapMasterData(await masterDataAPI.getWarehouses()).map(mapLookup)),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
    }),
  salesEmployees: () =>
    queryOptions({
      queryKey: createSharedKeys.salesEmployees(),
      queryFn: async () =>
        normalizeLookups((await fetchSalesEmployees()).data.map(mapSalesEmployeeLookup)),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
    }),
  taxCodes: () =>
    queryOptions({
      queryKey: createSharedKeys.taxCodes(),
      queryFn: async () =>
        normalizeLookups(unwrapMasterData(await masterDataAPI.getTaxCodes()).map(mapLookup)),
      staleTime: QUERY_CACHE_POLICY.createStaticLookup.staleTime,
      gcTime: QUERY_CACHE_POLICY.createStaticLookup.gcTime,
    }),
}
