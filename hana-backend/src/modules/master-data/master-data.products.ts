import { getCachedData, peekCachedData, setCachedData } from "@/core/utils/cache";

import { toTrimmed } from "./master-data.lookup-cache";
import { loadProductsForTenant } from "./master-data.products-load";

const PRODUCTS_TTL_MS = 1000 * 60 * 10;
/** Cap unbounded search so LOWER(LIKE) scans cannot return entire OITM. */
const SEARCH_RESULT_CAP = 100;
/** Browse list default when client omits limit. */
const DEFAULT_BROWSE_LIMIT = 100;
/**
 * Progressive popup limits (FE starts at 10, then expands).
 * Larger pages seed smaller ones so scroll-load does not re-hit HANA.
 */
const BROWSE_WARM_LIMIT = 50;
const BROWSE_SEED_LIMITS = [10, 20, 30, 40, 50, 100] as const;

const buildProductsCacheKey = (
  dbName: string,
  warehouseCode: string,
  searchKey: string,
  limitToken: string,
  type: string,
  priceListToken: string,
) =>
  `master:${dbName}:Products:v12:${warehouseCode || "default"}:${searchKey}:${limitToken}:${type}:pl${priceListToken}`;

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
  const typeToken = type || "default";
  const priceListToken = priceList !== undefined ? String(priceList) : "default";

  const resolvedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(1, Math.min(500, limit))
      : undefined;

  // ── Search path: always cap results; cache per search term + limit ──
  if (normalizedSearch) {
    const searchLimit = Math.min(resolvedLimit ?? SEARCH_RESULT_CAP, SEARCH_RESULT_CAP);
    const cacheKey = buildProductsCacheKey(
      dbName,
      normalizedWarehouseCode,
      cacheSearchKey,
      String(searchLimit),
      typeToken,
      priceListToken,
    );
    return getCachedData(
      cacheKey,
      () =>
        loadProductsForTenant(
          dbName,
          normalizedWarehouseCode,
          normalizedSearch,
          searchLimit,
          DEFAULT_BROWSE_LIMIT,
          type,
          priceList,
        ),
      PRODUCTS_TTL_MS,
    );
  }

  // ── Browse path (no search): hierarchical cache so 10 → 50 is one HANA load ──
  const requestedLimit = resolvedLimit ?? DEFAULT_BROWSE_LIMIT;

  const browseKey = (limitToken: number | string) =>
    buildProductsCacheKey(
      dbName,
      normalizedWarehouseCode,
      "all",
      String(limitToken),
      typeToken,
      priceListToken,
    );

  // Prefer an exact or larger already-cached browse page, then slice.
  const candidateLimits = [
    ...new Set(
      [requestedLimit, BROWSE_WARM_LIMIT, DEFAULT_BROWSE_LIMIT, ...BROWSE_SEED_LIMITS].filter(
        (limit) => limit >= requestedLimit,
      ),
    ),
  ].sort((left, right) => left - right);

  for (const candidate of candidateLimits) {
    const hit = peekCachedData<unknown[]>(browseKey(candidate));
    if (Array.isArray(hit) && hit.length >= 0) {
      return hit.slice(0, requestedLimit);
    }
  }

  // First paint (quick limit): fetch only what was asked so popup opens fast.
  // Expansion (limit > quick): warm BROWSE_WARM_LIMIT once and seed smaller pages.
  const quickLimit = BROWSE_SEED_LIMITS[0];
  const fetchLimit =
    requestedLimit <= quickLimit ? requestedLimit : Math.max(requestedLimit, BROWSE_WARM_LIMIT);

  const rows = await getCachedData(
    browseKey(fetchLimit),
    () =>
      loadProductsForTenant(
        dbName,
        normalizedWarehouseCode,
        "",
        fetchLimit,
        DEFAULT_BROWSE_LIMIT,
        type,
        priceList,
      ),
    PRODUCTS_TTL_MS,
  );

  // Seed smaller progressive limits from the warm page (no extra HANA work).
  if (Array.isArray(rows) && fetchLimit >= BROWSE_WARM_LIMIT) {
    for (const seed of BROWSE_SEED_LIMITS) {
      if (seed < fetchLimit) {
        setCachedData(browseKey(seed), rows.slice(0, seed), PRODUCTS_TTL_MS);
      }
    }
  }

  return Array.isArray(rows) ? rows.slice(0, requestedLimit) : rows;
};
