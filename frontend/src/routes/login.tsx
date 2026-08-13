import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import { LoginIntercompanyShowcase } from "@/features/auth/components/login-intercompany-showcase";
import { useDocumentTitle } from "@/hooks/use-document-title";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { toast } from "@/shared/ui/toast/toast";
import { useAuthStore } from "@/store/auth/auth.store";

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

  useEffect(function showSessionEndedNotice() {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (reason === "session_ended") {
      toast.info("Your session ended. Please sign in again.", {
        id: "session-logout",
      });
    }
  }, []);

  return (
    <main className="flex h-svh overflow-hidden">
      <LoginIntercompanyShowcase />

      <div className="flex h-svh flex-1 flex-col items-center justify-center overflow-hidden bg-linen-50 px-6 py-6">
        <div className="w-full max-w-100">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
