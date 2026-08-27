/** QUERY_CACHE_KEY: LocalStorage key for React Query persistence. */
export const QUERY_CACHE_KEY = "vendorportal.rq.cache";
export const CLEAR_QUERY_CACHE_EVENT = "vendorportal:clear-query-cache";

/**
 * Only these query roots/segments are written to localStorage.
 * Avoids thrashing from products search, stocks, table lists, and document details.
 */
const PERSIST_AUTH_SEGMENTS = new Set(["organization", "user"]);

/** Static create-page master data only (not products/stocks/bins). */
const PERSIST_CREATE_SHARED_SEGMENTS = new Set([
  "vendors-ic-v1",
  "customers-ic-v1",
  "warehouses",
  "sales-employees",
  "tax-codes",
  "uoms",
  "price-lists",
  "branches",
]);

/** shouldPersistQueryKey: Whether a React Query key is safe/useful to persist. */
export function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }
  const root = queryKey[0];
  if (root === "auth") {
    return typeof queryKey[1] === "string" && PERSIST_AUTH_SEGMENTS.has(queryKey[1]);
  }
  if (root === "create-shared") {
    return typeof queryKey[1] === "string" && PERSIST_CREATE_SHARED_SEGMENTS.has(queryKey[1]);
  }
  return false;
}

/** clearPersistedQueryCache: Safely purges cached query data from physical storage. */
export function clearPersistedQueryCache() {
  try {
    localStorage.removeItem(QUERY_CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}

/** requestQueryCacheClear: Broadcasts a UI-wide cache clear request (current tab + listeners). */
export function requestQueryCacheClear() {
  clearPersistedQueryCache();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLEAR_QUERY_CACHE_EVENT));
  }
}
