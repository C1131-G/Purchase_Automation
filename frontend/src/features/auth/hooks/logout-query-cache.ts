import type { QueryClient } from "@tanstack/react-query";

import { authKeys, authQueries } from "@/features/auth/api/auth.queries";

const isOrganizationQuery = (queryKey: readonly unknown[]): boolean => {
  const organizationKey = authKeys.organization();
  return (
    queryKey.length === organizationKey.length &&
    queryKey.every((value, index) => value === organizationKey[index])
  );
};

/** Finalize the in-memory cache after the protected route has unmounted. */
export const finalizeLogoutQueryCache = async (queryClient: QueryClient): Promise<void> => {
  queryClient.removeQueries({
    predicate: (query) => !isOrganizationQuery(query.queryKey),
  });
  try {
    await queryClient.prefetchQuery(authQueries.organization());
  } catch {
    // Non-blocking: the login screen remains usable if warm-up fails.
  }
};
