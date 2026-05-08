/** Auth Queries: TanStack Query keys and factories for authentication state and user profile. */
import { queryOptions } from "@tanstack/react-query";

import { authAPI, OrganizationsAPI } from "@/features/auth/api/auth.service";
import type { Organization } from "@/features/auth/api/auth.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

const ORG_CACHE_KEY = "auth:organizations:cache";
const ORG_CACHE_MAX_AGE_MS = QUERY_CACHE_POLICY.authOrganization.staleTime;

interface OrganizationCache {
  timestamp: number;
  data: Organization[];
}

const readCachedOrganizationsEntry = (): OrganizationCache | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(ORG_CACHE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as OrganizationCache;
    if (!Array.isArray(parsed?.data)) {
      return undefined;
    }
    if (typeof parsed?.timestamp !== "number") {
      return undefined;
    }
    if (Date.now() - parsed.timestamp > ORG_CACHE_MAX_AGE_MS) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
};

const writeCachedOrganizations = (data: Organization[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: OrganizationCache = { data, timestamp: Date.now() };
    window.localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
};

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
  // organization: Fetches list (Cached for 24 hours).
  organization: () => {
    const cached = readCachedOrganizationsEntry();

    return queryOptions({
      gcTime: QUERY_CACHE_POLICY.authOrganization.gcTime,
      initialData: cached?.data,
      initialDataUpdatedAt: (cached?.timestamp ?? 0) as number,
      queryFn: async () => {
        const { data } = await OrganizationsAPI.getAll();
        writeCachedOrganizations(data);
        return data;
      },
      queryKey: authKeys.organization(),
      staleTime: QUERY_CACHE_POLICY.authOrganization.staleTime,
    });
  },

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
