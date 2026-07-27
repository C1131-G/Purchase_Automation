/** useLogin: Orchestrates the login flow, including validation and session establishment. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { authKeys } from "@/features/auth/api/auth.queries";
import { authAPI } from "@/features/auth/api/auth.service";
import type { LoginRequest } from "@/features/auth/api/auth.service";
import {
  prefetchOverviewAfterLogin,
  prefetchTableDataAfterLogin,
  scheduleIdlePrefetch,
} from "@/features/auth/api/login-table-prefetch";
import { useClearAuthError, useLoginAction, useSetAuthError } from "@/store/auth/auth.store";
import { useSetSidebarAction } from "@/store/sidebar/sidebar.store";

// useLogin: Custom hook bridging UI, backend auth API, and global store state.
export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Using individual atomic selectors as requested
  const login = useLoginAction();
  const setError = useSetAuthError();
  const clearError = useClearAuthError();
  const setSidebarOpen = useSetSidebarAction();

  return useMutation({
    // mutationFn: Triggers the login API call with credentials.
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),

    // onMutate: Resets local/global errors before new attempt.
    onMutate: () => {
      clearError();
    },

    // onSuccess: Synchronizes global store, cache, and navigation on success.
    onSuccess: (response) => {
      if (response.success && response.data?.user) {
        // Sync the Zustand store
        login(response.data.user);
        setSidebarOpen(true);

        // Sync the Query Cache (Blueprint)
        queryClient.setQueryData(authKeys.user(), response.data.user);

        // Navigate immediately — overview prefetch races in parallel (session cookie ready).
        void navigate({
          replace: true,
          to: "/dashboard",
        });

        // Priority: warm Overview React Query cache so first paint is instant when ready.
        void prefetchOverviewAfterLogin(queryClient);

        // Warm table caches only after idle so they do not fight Overview on the HANA pool.
        scheduleIdlePrefetch(async () => {
          await prefetchTableDataAfterLogin(queryClient);
        });
      } else {
        setError("Login successful, but user profile was missing.");
      }
    },

    // onError: Maps backend errors to UI state for user feedback.
    onError: (error: Error) => {
      const message = error.message || "Authentication failed. Please check your credentials.";
      const normalized = message.toLowerCase();

      const isRateLimited =
        normalized.includes("too many") ||
        normalized.includes("rate") ||
        normalized.includes("429");
      if (isRateLimited) {
        setError(
          message.includes("Too many") || message.length > 0 ? message : "Too many attempts",
        );
        return;
      }

      // Credential and network/other failures all use inline form error state.
      setError(message);
    },
  });
}
