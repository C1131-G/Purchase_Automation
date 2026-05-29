import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { goeyToast } from "goey-toast";
import { useEffect } from "react";

import { GOEY_LOGIN_TOAST_DURATION } from "@/components/goey-toast.config";
import { authKeys, authQueries } from "@/features/auth/api/auth.queries";
import type { User } from "@/features/auth/api/auth.service";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { useAuthStore } from "@/store/auth/auth.store";

const USER_CHECK_SKIP_MS = 15_000;
const USER_CHECK_ATTEMPT_SKIP_MS = 5 * 60 * 1000;

/**
 * LoginRoute: Public entry point for authentication.
 * Lightweight check - only redirects if user is already authenticated in local state.
 * No forced session probe in loader to avoid 401 on public page.
 */
export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    // Only redirect if user is already authenticated in local state
    // This avoids triggering a 401 on the public login page
    const { isAuthenticated, logoutReason } = useAuthStore.getState();

    // If authenticated, redirect to app
    if (isAuthenticated) {
      throw redirect({
        search: { limit: 10, page: 1 },
        to: "/purchase/quotations",
      });
    }

    // If logout was intentional (user-triggered), clear the reason after redirect
    // The logoutReason will be handled by the login component via URL params
    if (logoutReason) {
      useAuthStore.getState().clearError();
    }
  },
  component: LoginComponent,
});

function LoginComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const SESSION_WARNING_TOAST_ID = "auth-session-ended";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (reason !== "session_ended") {
      return;
    }

    goeyToast.warning("Session ended", {
      duration: GOEY_LOGIN_TOAST_DURATION,
      id: SESSION_WARNING_TOAST_ID,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let checkTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: ReturnType<typeof requestIdleCallback> | null = null;
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    const isSessionEndedReason = reason === "session_ended";
    const isExplicitLogoutReason = reason === "logged_out";
    const lastFailRaw = window.sessionStorage.getItem("auth:me:check:last-fail-at");
    const lastFailAt = lastFailRaw ? Number(lastFailRaw) : 0;
    const lastAttemptRaw = window.sessionStorage.getItem("auth:me:check:last-attempt-at");
    const lastAttemptAt = lastAttemptRaw ? Number(lastAttemptRaw) : 0;
    const shouldSkipByRecentFailure =
      Number.isFinite(lastFailAt) && Date.now() - lastFailAt < USER_CHECK_SKIP_MS;
    const shouldSkipByRecentAttempt =
      Number.isFinite(lastAttemptAt) && Date.now() - lastAttemptAt < USER_CHECK_ATTEMPT_SKIP_MS;
    const cachedUser = queryClient.getQueryData<User>(authKeys.user());

    if (isSessionEndedReason || isExplicitLogoutReason || shouldSkipByRecentFailure) {
      return () => {
        isMounted = false;
      };
    }

    if (cachedUser) {
      useAuthStore.getState().login(cachedUser);
      navigate({
        replace: true,
        search: {
          limit: 10,
          page: 1,
        },
        to: "/purchase/quotations",
      });
      return () => {
        isMounted = false;
      };
    }

    if (shouldSkipByRecentAttempt) {
      return () => {
        isMounted = false;
      };
    }

    const probeSession = () => {
      window.sessionStorage.setItem("auth:me:check:last-attempt-at", String(Date.now()));
      void queryClient
        .fetchQuery(authQueries.user())
        .then((user) => {
          if (!isMounted) {
            return;
          }
          window.sessionStorage.removeItem("auth:me:check:last-fail-at");
          useAuthStore.getState().login(user);
          navigate({
            replace: true,
            search: {
              limit: 10,
              page: 1,
            },
            to: "/purchase/quotations",
          });
        })
        .catch(() => {
          window.sessionStorage.setItem("auth:me:check:last-fail-at", String(Date.now()));
        });
    };

    const runProbeSession = () => void probeSession();
    if ("requestIdleCallback" in window) {
      idleCallbackId = window.requestIdleCallback(runProbeSession, {
        timeout: 1200,
      });
    } else {
      checkTimeoutId = globalThis.setTimeout(runProbeSession, 300);
    }

    return () => {
      isMounted = false;
      if (checkTimeoutId !== null) {
        window.clearTimeout(checkTimeoutId);
      }
      if (idleCallbackId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [navigate, queryClient]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-white">
      <div>
        <LoginForm />
      </div>
    </div>
  );
}
