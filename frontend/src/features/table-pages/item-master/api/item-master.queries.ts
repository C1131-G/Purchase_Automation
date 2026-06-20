import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { itemMasterAPI } from "@/features/table-pages/item-master/api/item-master.service";
import type { ItemMasterListParams } from "@/features/table-pages/item-master/api/item-master.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const itemMasterKeys = {
  all: ["itemMaster"] as const,
  detailById: (id: string | number) => [...itemMasterKeys.all, "detail", id] as const,
  list: (params: ItemMasterListParams) => [...itemMasterKeys.all, "list", params] as const,
  itemCodeSuggestions: (search?: string, limit?: number) =>
    [...itemMasterKeys.all, "item-code-suggestions", search ?? "", limit ?? "all"] as const,
  itemNameSuggestions: (search?: string, limit?: number) =>
    [...itemMasterKeys.all, "item-name-suggestions", search ?? "", limit ?? "all"] as const,
  itemGroupSuggestions: (search?: string, limit?: number) =>
    [...itemMasterKeys.all, "item-group-suggestions", search ?? "", limit ?? "all"] as const,
  itemUOMSuggestions: (search?: string, limit?: number) =>
    [...itemMasterKeys.all, "item-uom-suggestions", search ?? "", limit ?? "all"] as const,
  itemBarCodeSuggestions: (search?: string, limit?: number) =>
    [...itemMasterKeys.all, "item-barcode-suggestions", search ?? "", limit ?? "all"] as const,
};

export const itemMasterQueries = {
  detailById: (id: string | number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => itemMasterAPI.getItemById(id),
      queryKey: itemMasterKeys.detailById(id),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  list: (params: ItemMasterListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => itemMasterAPI.getItems(params),
      queryKey: itemMasterKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  itemCodeSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => itemMasterAPI.getItemCodes({ search, limit }),
      queryKey: itemMasterKeys.itemCodeSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  itemNameSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => itemMasterAPI.getItemNames({ search, limit }),
      queryKey: itemMasterKeys.itemNameSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  itemGroupSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => itemMasterAPI.getItemGroups({ search, limit }),
      queryKey: itemMasterKeys.itemGroupSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  itemUOMSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => itemMasterAPI.getItemUOMs({ search, limit }),
      queryKey: itemMasterKeys.itemUOMSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  itemBarCodeSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => itemMasterAPI.getItemBarCodes({ search, limit }),
      queryKey: itemMasterKeys.itemBarCodeSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
