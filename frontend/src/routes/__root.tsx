import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { NotFound } from "@/components/not-found";
import { AppToaster } from "@/shared/ui/toast/toaster";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("@tanstack/react-router-devtools");
      return { default: module.TanStackRouterDevtools };
    })
  : undefined;

/**
 * Root: Global application container.
 * THEME: Enterprise — Ink/Teal/Linen (light, surface on linen).
 * ARCHITECTURE: Context provider for QueryClient and TanStack Router Outlet.
 * TYPOGRAPHY: Enforces `font-outfit` as the industrial sans-serif baseline.
 * Toasts: single Sonner host for the whole app (see shared/ui/toast).
 */
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <div className="min-h-dvh h-dvh bg-surface text-ink-900 font-outfit selection:bg-teal-500/15 selection:text-teal-900 relative overflow-hidden flex flex-col">
      <main className="relative z-10 flex-1 flex flex-col min-h-0 h-full w-full">
        <Outlet />
      </main>
      <AppToaster />
      {TanStackRouterDevtools ? (
        <Suspense fallback={null}>
          <TanStackRouterDevtools position="bottom-left" />
        </Suspense>
      ) : null}
    </div>
  );
}
