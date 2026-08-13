/** useLogin: Orchestrates the login flow, including validation and session establishment. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { authKeys } from "@/features/auth/api/auth.queries";
import { authAPI } from "@/features/auth/api/auth.service";
import type { LoginRequest } from "@/features/auth/api/auth.service";
import {
  CREATE_MASTER_WARMUP_IDLE_MS,
  prefetchCreateMasterAfterLogin,
  prefetchOverviewAfterLogin,
  prefetchTableDataAfterLogin,
  scheduleIdlePrefetch,
} from "@/features/auth/api/login-table-prefetch";
import { useClearAuthError, useLoginAction, useSetAuthError } from "@/store/auth/auth.store";
import { useSetSidebarAction } from "@/store/sidebar/sidebar.store";

// useLogin: Custom hook bridging UI, backend auth API, and global store state.
export function useLogin() {
  const navigate = useNavigate();
  const router = useRouter();
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
      // Load dashboard code while authentication is in flight. The dashboard
      // has no auth loader, so this does not issue protected data requests early.
      void router.preloadRoute({ to: "/dashboard" });
    },

    // onSuccess: Synchronizes global store, cache, and navigation on success.
    onSuccess: (response) => {
      if (response.success && response.data?.user) {
        // Sync the Zustand store
        login(response.data.user);
        setSidebarOpen(true);

        // Sync the Query Cache (Blueprint)
        queryClient.setQueryData(authKeys.user(), response.data.user);

        // Start overview data first, then navigate without waiting. Route code was
        // already preloaded during login, so both paths converge on the same query.
        void prefetchOverviewAfterLogin(queryClient);
        void navigate({ replace: true, to: "/dashboard" });

        // Create master (vendors/WH/SE) — shorter idle so open-create after login is warm.
        scheduleIdlePrefetch(async () => {
          await prefetchCreateMasterAfterLogin(queryClient);
        }, CREATE_MASTER_WARMUP_IDLE_MS);

        // Table list caches stay more deferred so they do not fight Overview on the HANA pool.
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
