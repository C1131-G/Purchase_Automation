import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { useEffect } from "react";

import { useDocumentTitle } from "@/hooks/use-document-title";

import { authKeys } from "@/features/auth/api/auth.queries";
import { authAPI } from "@/features/auth/api/auth.service";
import type { User } from "@/features/auth/api/auth.service";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { toast } from "@/shared/ui/toast/toast";
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
        to: "/dashboard",
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
  useDocumentTitle("Access Gateway | Purchase Automation");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (reason === "session_ended") {
      toast.info("Your session ended. Please sign in again.", {
        id: "session-logout",
      });
    }
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
        to: "/dashboard",
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
      void authAPI
        .getMe()
        .then((response) => {
          if (!isMounted) {
            return;
          }
          const user = response.data.user;
          queryClient.setQueryData(authKeys.user(), user);
          window.sessionStorage.removeItem("auth:me:check:last-fail-at");
          useAuthStore.getState().login(user);
          navigate({
            replace: true,
            to: "/dashboard",
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
    <div className="flex h-svh overflow-hidden">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-12 lg:flex lg:w-[55%] border-r border-surface/10">
        <div
          aria-hidden
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-teal-500/18 blur-3xl opacity-40"
        />
        <div
          aria-hidden
          className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/4 translate-y-1/4 rounded-full bg-teal-700/14 blur-3xl opacity-35"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 shadow-lg shadow-teal-600/20 ring-1 ring-surface/15 border border-surface/10">
            <Building2 className="h-6 w-6 text-surface" />
          </div>
          <span className="text-xl font-bold tracking-wider text-surface uppercase">
            Purchase Automation
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-surface lg:text-5xl">
            Enterprise operations,
            <span className="block text-teal-200 mt-2">one unified view.</span>
          </h2>
          <p className="max-w-md text-base leading-relaxed text-neutral-400 font-normal">
            Manage orders, invoices, and payments across every entity — all from a single, connected
            workspace.
          </p>
        </div>

        <p className="relative z-10 text-xs font-medium text-neutral-500/70">
          © {new Date().getFullYear()} Vedhasoft. All rights reserved.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-linen-50 px-6 py-8">
        <div className="w-full max-w-100">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
