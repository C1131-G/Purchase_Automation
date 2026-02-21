/** QUERY_CACHE_KEY: LocalStorage key for React Query persistence. */
export const QUERY_CACHE_KEY = 'vendorportal.rq.cache'

/** clearPersistedQueryCache: Safely purges cached query data from physical storage. */
export function clearPersistedQueryCache() {
  try {
    localStorage.removeItem(QUERY_CACHE_KEY)
  } catch {
    // ignore storage errors
  }
}
