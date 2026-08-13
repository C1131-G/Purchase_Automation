/** useLogout: Handlers for secure session termination and cache purging. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { authQueries } from "@/features/auth/api/auth.queries";
import { clearPersistedQueryCache } from "@/shared/utils/query-cache-persistence";
import { useLogoutAction } from "@/store/auth/auth.store";

/**
 * Custom hook to manage the user logout mutation.
 *
 * Follows the standard pattern:
 * 1. Calls the logout API (fire and forget).
 * 2. Clears the persisted React Query cache.
 * 3. Triggers the Zustand logout action and navigates to login.
 * 4. Clears the in-memory cache after the protected screen unmounts.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logoutAction = useLogoutAction();

  return useMutation({
    mutationFn: async () => {
      // 1. Stop in-flight protected requests from finishing after logout.
      await queryClient.cancelQueries();

      // 2. Clear persisted data immediately to prevent cross-user stale hydration.
      // Keep in-memory data until navigation completes so the blurred page does not
      // replace its current content with loading skeletons during logout.
      clearPersistedQueryCache();

      // 3. Single source logout flow (includes best-effort backend call)
      await logoutAction();

      // 4. Mark explicit logout so login route skips /auth/me probe.
      await navigate({
        replace: true,
        search: { reason: "logged_out" },
        to: "/login",
      });

      // 5. The protected screen is now unmounted, so clearing cannot reveal a skeleton.
      queryClient.clear();

      // 6. Warm organizations so the login dropdown has fresh data.
      try {
        await queryClient.prefetchQuery(authQueries.organization());
      } catch {
        // Non-blocking: the login screen remains usable if warm-up fails.
      }
    },
  });
}
