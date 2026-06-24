/** useLogin: Orchestrates the login flow, including validation and session establishment. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { goeyToast } from "goey-toast";

import { GOEY_LOGIN_TOAST_DURATION } from "@/components/goey-toast.config";
import { authKeys } from "@/features/auth/api/auth.queries";
import { authAPI } from "@/features/auth/api/auth.service";
import type { LoginRequest } from "@/features/auth/api/auth.service";
import {
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
  const LOGIN_ERROR_TOAST_ID = "auth-login-error";

  return useMutation({
    // mutationFn: Triggers the login API call with credentials.
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),

    // onMutate: Resets local/global errors before new attempt.
    onMutate: () => {
      clearError();
      goeyToast.dismiss(LOGIN_ERROR_TOAST_ID);
    },

    // onSuccess: Synchronizes global store, cache, and navigation on success.
    onSuccess: (response) => {
      if (response.success && response.data?.user) {
        // Sync the Zustand store
        login(response.data.user);
        setSidebarOpen(true);

        // Sync the Query Cache (Blueprint)
        queryClient.setQueryData(authKeys.user(), response.data.user);

        // Stamp submit→dashboard latency start point (read in DashboardCanvas on mount).
        (window as unknown as Record<string, unknown>).__loginSubmitAt = Date.now();

        // Navigate directly to the purchase dashboard — no intermediate redirect hop.
        void navigate({
          to: "/dashboard/purchase",
          search: { period: "week" },
        });

        // Warm caches in the background only after the page is already usable.
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

      // Keep credential errors inline in the form; use toasts for broader/network issues.
      const normalized = message.toLowerCase();
      const isCredentialError =
        normalized.includes("invalid credentials") ||
        normalized.includes("verify your details") ||
        normalized.includes("username") ||
        normalized.includes("password");
      if (isCredentialError) {
        setError(message);
        return;
      }

      // Toast-based errors should not also show duplicate inline error text.
      clearError();

      const isRateLimited =
        normalized.includes("too many") ||
        normalized.includes("rate") ||
        normalized.includes("429");
      if (isRateLimited) {
        goeyToast.warning("Too many attempts", {
          duration: GOEY_LOGIN_TOAST_DURATION,
          id: LOGIN_ERROR_TOAST_ID,
        });
        return;
      }

      goeyToast.error("Unable to sign in", {
        duration: GOEY_LOGIN_TOAST_DURATION,
        id: LOGIN_ERROR_TOAST_ID,
      });
    },
  });
}
