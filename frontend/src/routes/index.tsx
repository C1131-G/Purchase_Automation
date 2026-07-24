import { createFileRoute, redirect } from "@tanstack/react-router";

import { authKeys } from "@/features/auth/api/auth.queries";
import { authAPI } from "@/features/auth/api/auth.service";
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
        to: "/dashboard",
      });
    }

    try {
      const response = await authAPI.getMe();
      const user = response.data.user;
      context.queryClient.setQueryData(authKeys.user(), user);
      useAuthStore.getState().login(user);
      throw redirect({
        to: "/dashboard",
      });
    } catch {
      // No active session; continue to login.
    }

    throw redirect({ to: "/login" });
  },
});
