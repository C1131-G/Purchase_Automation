import { createFileRoute, redirect } from "@tanstack/react-router";

import { authQueries } from "@/features/auth/api/auth.queries";
import { useAuthStore } from "@/store/auth/auth.store";

/**
 * EntryReceptionist: Root redirect logic.
 * Analyzes auth state to switch between dashboard and login view.
 */
export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (isAuthenticated) {
      throw redirect({
        search: {
          limit: 10,
          page: 1,
        },
        to: "/purchase/orders",
      });
    }

    try {
      const user = await context.queryClient.ensureQueryData(authQueries.user());
      useAuthStore.getState().login(user);
      throw redirect({
        search: {
          limit: 10,
          page: 1,
        },
        to: "/purchase/orders",
      });
    } catch {
      // No active session; continue to login.
    }

    throw redirect({ to: "/login" });
  },
});
