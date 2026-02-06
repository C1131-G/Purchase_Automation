import { queryOptions } from '@tanstack/react-query'

import { authAPI, OrganizationsAPI } from '@/api/auth.service'

/**
 * Centralized Query Key Registry.
 * Follows a hierarchical structure to allow for tactical cache invalidation.
 */
export const authKeys = {
  /** Root key for all authentication-related state */
  all: ['auth'] as const,
  /** Specific key for the list of available organizations */
  organization: () => [...authKeys.all, 'organization'] as const,
  /** Specific key for the logged-in user profile */
  user: () => [...authKeys.all, 'user'] as const,
}

/**
 * Auth Query Factory.
 * Provides reusable query options for fetching and caching authentication data.
 */
export const authQueries = {
  /**
   * Fetches the organization list.
   * Optimized for static data: Cached for 24 hours.
   */
  organization: () =>
    queryOptions({
      queryKey: authKeys.organization(),
      queryFn: () => OrganizationsAPI.getAll().then((res) => res.data),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      gcTime: 1000 * 60 * 60 * 24 + 1000 * 60 * 10, // 24 hours + 10 mins
    }),

  /**
   * Fetches the current user profile.
   * Balanced for session security: Stays fresh for 30 minutes.
   */
  user: () =>
    queryOptions({
      queryKey: authKeys.user(),
      queryFn: () => authAPI.getMe().then((res) => res.data.user),
      staleTime: 1000 * 60 * 30, // 30 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
    }),
}
