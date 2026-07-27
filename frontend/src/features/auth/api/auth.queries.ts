/** Auth Queries: TanStack Query keys and factories for authentication state and user profile. */
import { queryOptions } from "@tanstack/react-query";

import { authAPI, OrganizationsAPI } from "@/features/auth/api/auth.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

// authKeys: Centralized query key registry for tactical cache invalidation.
export const authKeys = {
  // Root key for all authentication-related state.
  all: ["auth"] as const,
  // organization: Specific key for available organizations list.
  organization: () => [...authKeys.all, "organization"] as const,
  // user: Specific key for logged-in user profile.
  user: () => [...authKeys.all, "user"] as const,
};

// authQueries: Reusable query options for fetching/caching authentication data.
export const authQueries = {
  /**
   * organization: Tenant list for the login company picker.
   * Loaded once and cached for a long time — backend returns the full list
   * (no username filter), so keying/refetching on username only wasted requests
   * and made the form feel slower while typing.
   */
  organization: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.authOrganization.gcTime,
      queryFn: async () => {
        const { data } = await OrganizationsAPI.getAll();
        return data;
      },
      queryKey: authKeys.organization(),
      staleTime: QUERY_CACHE_POLICY.authOrganization.staleTime,
    }),

  // user: Fetches user profile (Fresh for 30 minutes).
  user: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.authUser.gcTime,
      queryFn: () => authAPI.getMe().then((res) => res.data.user),
      queryKey: authKeys.user(),
      retry: false,
      staleTime: QUERY_CACHE_POLICY.authUser.staleTime,
    }),
};
