export const QUERY_CACHE_KEY = 'vendorportal.rq.cache'

export function clearPersistedQueryCache() {
  try {
    localStorage.removeItem(QUERY_CACHE_KEY)
  } catch {
    // ignore storage errors
  }
}
