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
 * 2. Clears the React Query cache.
 * 3. Triggers the Zustand logout action to clear state and redirect.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logoutAction = useLogoutAction();

  return useMutation({
    mutationFn: async () => {
      // 1. Stop in-flight protected requests from finishing after logout.
      await queryClient.cancelQueries();

      // 2. Clear in-memory + persisted cache before redirect to prevent cross-user stale hydrate.
      clearPersistedQueryCache();
      queryClient.clear();

      // 3. Single source logout flow (includes best-effort backend call)
      await logoutAction();

      // 4. Warm organizations after logout so login dropdown has fresh data.
      try {
        await queryClient.prefetchQuery(authQueries.organization());
      } catch {
        // Non-blocking: login navigation must continue even if warm-up fails.
      }

      // 5. Mark explicit logout so login route skips /auth/me probe.
      await navigate({
        replace: true,
        search: { reason: "logged_out" },
        to: "/login",
      });
    },
  });
}
