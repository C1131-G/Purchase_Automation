import { getCachedData } from "@/core/utils/cache";

import { toTrimmed } from "./master-data.lookup-cache";
import { loadProductsForTenant } from "./master-data.products-load";

export const getProducts = async (
  dbName: string,
  warehouseCode?: string,
  search?: string,
  limit?: number,
  type?: "sales" | "purchase",
  priceList?: number,
) => {
  const normalizedWarehouseCode = toTrimmed(warehouseCode);
  const normalizedSearch = toTrimmed(search);
  const cacheSearchKey = normalizedSearch ? normalizedSearch.toLowerCase() : "all";
  const resolvedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(1, Math.min(500, limit))
      : undefined;
  const defaultListLimit = 100;

  const cacheLimitToken = normalizedSearch
    ? resolvedLimit !== undefined
      ? String(resolvedLimit)
      : "unlimited"
    : String(resolvedLimit ?? defaultListLimit);
  const priceListToken = priceList !== undefined ? String(priceList) : "default";
  const cacheKey = `master:${dbName}:Products:v11:${normalizedWarehouseCode || "default"}:${cacheSearchKey}:${cacheLimitToken}:${type || "default"}:pl${priceListToken}`;

  return getCachedData(
    cacheKey,
    () =>
      loadProductsForTenant(
        dbName,
        normalizedWarehouseCode,
        normalizedSearch,
        resolvedLimit,
        defaultListLimit,
        type,
        priceList,
      ),
    1000 * 60 * 10,
  );
};
