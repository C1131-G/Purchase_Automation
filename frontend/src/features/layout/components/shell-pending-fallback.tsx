import { useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { Sidebar, SidebarInset, SidebarProvider } from "@/components/sidebar";
import type { TableRoutePath } from "@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch";
import { cn } from "@/shared/utils/cn";

import type { SectionKey } from "../utils/shell-layout.types";
import { RoutePendingFallback } from "./route-pending-fallback";
import { ShellLayoutBrandHeader } from "./shell-layout-brand-header";
import { ShellLayoutLogout } from "./shell-layout-logout";
import { ShellLayoutNavigation } from "./shell-layout-navigation";

function sectionFromPath(pathname: string): SectionKey {
  if (pathname.startsWith("/purchase")) {
    return "purchase";
  }
  if (pathname.startsWith("/sales")) {
    return "sales";
  }
  if (pathname.startsWith("/intercompany")) {
    return "intercompany";
  }
  return "dashboard";
}

/**
 * Full-app pending UI that keeps the ERP sidebar chrome visible.
 * Used while `/_layout` auth hydrates or before ShellLayout mounts —
 * never replace the whole viewport with content-only skeleton.
 */
export function ShellPendingFallback() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const isPublicAuth = pathname === "/login" || pathname.startsWith("/login/");

  const activeSection = useMemo(() => sectionFromPath(pathname), [pathname]);
  const isSectionOpen = useCallback(
    (section: SectionKey) => section === activeSection,
    [activeSection],
  );
  const noopToggle = useCallback((_section: SectionKey) => {}, []);
  const noopTableIntent = useCallback((_routePath: TableRoutePath) => {}, []);

  // Public auth screens should not paint the app shell.
  if (isPublicAuth) {
    return <RoutePendingFallback pathname={pathname} />;
  }

  return (
    <div className="h-dvh w-full bg-linen-50 overflow-hidden flex flex-col" aria-busy="true">
      <SidebarProvider className="h-full w-full overflow-hidden min-h-0!">
        <Sidebar className={cn("border-r border-linen-200 bg-surface")} collapsible="icon">
          <ShellLayoutBrandHeader />
          <ShellLayoutNavigation
            pathname={pathname}
            isSectionOpen={isSectionOpen}
            onToggleSection={noopToggle}
            onTableNavIntent={noopTableIntent}
          />
          <ShellLayoutLogout
            logoutBusy
            onLogout={() => {}}
            isFullscreen={false}
            onToggleFullscreen={() => {}}
          />
        </Sidebar>

        <SidebarInset
          className={cn(
            "bg-linen-50 h-full overflow-hidden min-h-0!",
            "md:pl-[5.5rem]",
            "pointer-events-none",
          )}
        >
          <main className="flex-1 p-0 overflow-hidden flex flex-col min-h-0">
            <RoutePendingFallback pathname={pathname} />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
