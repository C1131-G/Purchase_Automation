import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useSetSidebarAction, useSidebarOpen } from "@/store/sidebar/sidebar.store";

/**
 * useSidebarNavigation: Shared navigation hook that closes the sidebar
 * when route/pathname transitions start or complete, ensuring a single controlled close path.
 */
export function useSidebarNavigation() {
  const open = useSidebarOpen();
  const setOpen = useSetSidebarAction();

  const { pathname, pendingPathname } = useRouterState({
    select: (state) => ({
      pathname: state.resolvedLocation?.pathname ?? state.location.pathname,
      pendingPathname: state.status === "pending" ? state.location.pathname : undefined,
    }),
  });

  const prevPathnameRef = useRef<string>(pathname);

  useEffect(() => {
    // 1. If navigation starts to a different path
    if (pendingPathname && pendingPathname !== pathname) {
      if (open) {
        setOpen(false);
      }
    }
    // 2. If navigation completes and path changed
    else if (pathname !== prevPathnameRef.current) {
      if (open) {
        setOpen(false);
      }
      prevPathnameRef.current = pathname;
    }
  }, [pathname, pendingPathname, open, setOpen]);
}
