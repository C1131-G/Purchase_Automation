/** QUERY_TIME: Semantic duration constants in milliseconds for cleaner React Query config. */
export const QUERY_TIME = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
} as const

/**
 * QUERY_CACHE_POLICY: Centralized stale and garbage collection durations for the entire application.
 * Balances UI reactivity with backend resource conservation.
 */
export const QUERY_CACHE_POLICY = {
  tableList: {
    staleTime: 10 * QUERY_TIME.minute,
    gcTime: 1 * QUERY_TIME.hour,
  },
  detail: {
    staleTime: 5 * QUERY_TIME.minute,
    gcTime: 30 * QUERY_TIME.minute,
  },
  createDynamicLookup: {
    staleTime: 1 * QUERY_TIME.minute,
    gcTime: 10 * QUERY_TIME.minute,
  },
  createStaticLookup: {
    staleTime: 1 * QUERY_TIME.day,
    gcTime: 1 * QUERY_TIME.day + 10 * QUERY_TIME.minute,
  },
  authOrganization: {
    staleTime: 1 * QUERY_TIME.day,
    gcTime: 1 * QUERY_TIME.day + 10 * QUERY_TIME.minute,
  },
  authUser: {
    staleTime: 30 * QUERY_TIME.minute,
    gcTime: 1 * QUERY_TIME.hour,
  },
} as const
