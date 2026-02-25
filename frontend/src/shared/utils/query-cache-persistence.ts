/** QUERY_CACHE_KEY: LocalStorage key for React Query persistence. */
export const QUERY_CACHE_KEY = 'vendorportal.rq.cache'
export const CLEAR_QUERY_CACHE_EVENT = 'vendorportal:clear-query-cache'

/** clearPersistedQueryCache: Safely purges cached query data from physical storage. */
export function clearPersistedQueryCache() {
  try {
    localStorage.removeItem(QUERY_CACHE_KEY)
  } catch {
    // ignore storage errors
  }
}

/** requestQueryCacheClear: Broadcasts a UI-wide cache clear request (current tab + listeners). */
export function requestQueryCacheClear() {
  clearPersistedQueryCache()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CLEAR_QUERY_CACHE_EVENT))
  }
}
