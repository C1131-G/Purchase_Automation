import { useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import React from "react";

import { Sidebar, SidebarInset, SidebarProvider } from "@/components/sidebar";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { prefetchTableRouteIntent } from "@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch";
import type { TableRoutePath } from "@/features/table-pages/table-shared/hooks/sidebar-intent-prefetch";
import { cn } from "@/shared/utils/cn";
import { useAuthStore } from "@/store/auth/auth.store";
import { useSetSidebarAction } from "@/store/sidebar/sidebar.store";

import { useSidebarNavigation } from "../hooks/use-sidebar-navigation";
import type { SectionKey } from "../utils/shell-layout.types";
import { ShellLayoutBrandHeader } from "./shell-layout-brand-header";
import { ShellLayoutLogout } from "./shell-layout-logout";
import { ShellLayoutNavigation } from "./shell-layout-navigation";

// ShellLayout: Persistent Sidebar & Header Layout with Sapphire & White theme.
export function ShellLayout() {
  useSidebarNavigation();

  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoutReason = useAuthStore((state) => state.logoutReason);
  const setSidebarOpen = useSetSidebarAction();
  const logoutBusy = isLoggingOut || isAuthLoading;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = React.useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  }, []);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  React.useEffect(() => {
    if (isAuthenticated || isAuthLoading) {
      return;
    }

    if (logoutReason === "session_ended") {
      void navigate({
        replace: true,
        search: { reason: "session_ended" },
        to: "/login",
        viewTransition: true,
      });
      return;
    }

    if (logoutReason === "user") {
      void navigate({
        replace: true,
        search: { reason: "logged_out" },
        to: "/login",
        viewTransition: true,
      });
      return;
    }

    void navigate({ replace: true, to: "/login", viewTransition: true });
  }, [isAuthenticated, isAuthLoading, logoutReason, navigate]);

  // Accordion Logic: current section from URL.
  const activeSection = React.useMemo<SectionKey>(() => {
    if (location.pathname.startsWith("/dashboard")) {
      return "dashboard";
    }
    if (location.pathname.startsWith("/purchase")) {
      return "purchase";
    }
    if (location.pathname.startsWith("/sales")) {
      return "sales";
    }
    if (location.pathname.startsWith("/inventory")) {
      return "inventory";
    }
    return "dashboard";
  }, [location.pathname]);

  const [expandedSectionOverride, setExpandedSectionOverride] = React.useState<
    SectionKey | null | undefined
  >();
  const transitionTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  React.useEffect(
    () => () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    },
    [],
  );

  const isSectionOpen = React.useCallback(
    (section: SectionKey) => {
      if (expandedSectionOverride === undefined) {
        return activeSection === section;
      }
      if (expandedSectionOverride === null) {
        return false;
      }
      return expandedSectionOverride === section;
    },
    [activeSection, expandedSectionOverride],
  );

  // Accordion behavior: ensure current section closes before opening next one for smooth transitions.
  const handleToggle = React.useCallback(
    (section: SectionKey) => {
      setSidebarOpen(true);

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      const currentlyEffective =
        expandedSectionOverride === undefined ? activeSection : expandedSectionOverride;
      const isClosing = currentlyEffective === section;

      if (isClosing) {
        setExpandedSectionOverride(null);
        return;
      }

      // If another section is open, close it first then wait before opening new one
      if (currentlyEffective !== null) {
        setExpandedSectionOverride(null);
        transitionTimeoutRef.current = setTimeout(() => {
          setExpandedSectionOverride(section);
          transitionTimeoutRef.current = null;
        }, 300); // Matches SidebarMenuCollapsible transition duration
      } else {
        setExpandedSectionOverride(section);
      }
    },
    [activeSection, expandedSectionOverride, setSidebarOpen],
  );

  const handleTableNavIntent = React.useCallback(
    (routePath: TableRoutePath) => {
      void router.preloadRoute({ to: routePath as never });
      prefetchTableRouteIntent(queryClient, routePath);
    },
    [queryClient, router],
  );

  return (
    <div ref={containerRef} className="h-dvh w-full bg-zinc-50 overflow-hidden flex flex-col">
      <SidebarProvider className="h-full w-full overflow-hidden min-h-0!">
        <Sidebar className={cn("border-r border-zinc-100 bg-white")} collapsible="icon">
          <ShellLayoutBrandHeader />
          <ShellLayoutNavigation
            pathname={location.pathname}
            isSectionOpen={isSectionOpen}
            onToggleSection={handleToggle}
            onTableNavIntent={handleTableNavIntent}
          />
          <ShellLayoutLogout
            logoutBusy={logoutBusy}
            onLogout={() => logout()}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </Sidebar>

        <SidebarInset
          className={cn(
            "bg-zinc-50 transition-[filter,opacity] duration-150 h-full overflow-hidden min-h-0!",
            "md:pl-[5.5rem]",
            logoutBusy && "pointer-events-none opacity-80 blur-[2px]",
          )}
        >
          <main className="flex-1 p-0 overflow-hidden flex flex-col min-h-0">
            <div
              className="flex-1 min-h-0 w-full"
              style={{ viewTransitionName: "tab-content" } as React.CSSProperties}
            >
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
