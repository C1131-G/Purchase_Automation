export const QUERY_TIME = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
} as const

export const QUERY_CACHE_POLICY = {
  tableList: {
    staleTime: 0,
    gcTime: 5 * QUERY_TIME.minute,
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
