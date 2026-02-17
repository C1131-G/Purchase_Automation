import { queryOptions } from '@tanstack/react-query'

import { authAPI, OrganizationsAPI } from '@/features/auth/api/auth.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

// authKeys: Centralized query key registry for tactical cache invalidation.
export const authKeys = {
  // Root key for all authentication-related state.
  all: ['auth'] as const,
  // organization: Specific key for available organizations list.
  organization: () => [...authKeys.all, 'organization'] as const,
  // user: Specific key for logged-in user profile.
  user: () => [...authKeys.all, 'user'] as const,
}

// authQueries: Reusable query options for fetching/caching authentication data.
export const authQueries = {
  // organization: Fetches list (Cached for 24 hours).
  organization: () =>
    queryOptions({
      queryKey: authKeys.organization(),
      queryFn: () => OrganizationsAPI.getAll().then((res) => res.data),
      staleTime: QUERY_CACHE_POLICY.authOrganization.staleTime,
      gcTime: QUERY_CACHE_POLICY.authOrganization.gcTime,
    }),

  // user: Fetches user profile (Fresh for 30 minutes).
  user: () =>
    queryOptions({
      queryKey: authKeys.user(),
      queryFn: () => authAPI.getMe().then((res) => res.data.user),
      staleTime: QUERY_CACHE_POLICY.authUser.staleTime,
      gcTime: QUERY_CACHE_POLICY.authUser.gcTime,
      retry: false,
    }),
}
