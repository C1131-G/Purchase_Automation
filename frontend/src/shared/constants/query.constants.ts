/** QUERY_TIME: Semantic duration constants in milliseconds for cleaner React Query config. */
export const QUERY_TIME = {
  day: 1000 * 60 * 60 * 24,
  hour: 1000 * 60 * 60,
  minute: 1000 * 60,
  second: 1000,
} as const;

/**
 * QUERY_CACHE_POLICY: Centralized stale and garbage collection durations for the entire application.
 * Balances UI reactivity with backend resource conservation.
 */
export const QUERY_CACHE_POLICY = {
  authOrganization: {
    gcTime: 1 * QUERY_TIME.day + 10 * QUERY_TIME.minute,
    staleTime: 1 * QUERY_TIME.day,
  },
  authUser: {
    gcTime: 1 * QUERY_TIME.hour,
    staleTime: 30 * QUERY_TIME.minute,
  },
  createDynamicLookup: {
    gcTime: 30 * QUERY_TIME.minute,
    staleTime: 5 * QUERY_TIME.minute,
  },
  createStaticLookup: {
    gcTime: 1 * QUERY_TIME.day + 10 * QUERY_TIME.minute,
    staleTime: 1 * QUERY_TIME.day,
  },
  detail: {
    gcTime: 30 * QUERY_TIME.minute,
    staleTime: 5 * QUERY_TIME.minute,
  },
  tableList: {
    gcTime: 1 * QUERY_TIME.hour,
    staleTime: 10 * QUERY_TIME.minute,
  },
} as const;
