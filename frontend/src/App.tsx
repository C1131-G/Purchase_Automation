import "goey-toast/styles.css";
import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { GoeyToaster } from "goey-toast";
import { useEffect, useRef } from "react";

import { GlobalErrorBoundary } from "@/components/error-boundary";
import { GOEY_TOASTER_CONFIG } from "@/components/goey-toast.config";
import { routeTree } from "@/routeTree.gen";
import {
  CLEAR_QUERY_CACHE_EVENT,
  clearPersistedQueryCache,
  QUERY_CACHE_KEY,
} from "@/shared/utils/query-cache-persistence";
import { type BeforeInstallPromptEvent, usePwaActions } from "@/store/pwa/pwa.store";

const QUERY_CACHE_MAX_AGE = 30 * 60 * 1000;

// 1. Create a persistent QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const restoreQueryCache = () => {
  try {
    const raw = localStorage.getItem(QUERY_CACHE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as { timestamp: number; state: unknown };
    if (!parsed?.state) {
      return;
    }
    if (Date.now() - parsed.timestamp > QUERY_CACHE_MAX_AGE) {
      localStorage.removeItem(QUERY_CACHE_KEY);
      return;
    }
    hydrate(queryClient, parsed.state);
  } catch {
    localStorage.removeItem(QUERY_CACHE_KEY);
  }
};

restoreQueryCache();

// 2. Create the router and inject the queryClient into its context
const router = createRouter({
  context: {
    queryClient,
  },
  routeTree,
  defaultPendingMs: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// Route level hierarchy for transition direction detection.
// Level -1 = login, 0 = dashboards, 1 = tables, 2 = create/edit pages.
// ─────────────────────────────────────────────────────────────────────────────
function getRouteLevel(pathname: string): number {
  if (pathname === "/login" || pathname.startsWith("/login")) return -1;
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    return 0;
  }
  // Create / Edit pages are the deepest level
  if (
    pathname.includes("/create") ||
    pathname.includes("/edit") ||
    /\/create-[a-z]/.test(pathname)
  ) {
    return 2;
  }
  // Everything else under /purchase, /sales, /inventory is a table (level 1)
  return 1;
}

type TransitionType = "slide-left" | "slide-right" | "slide-up" | "slide-down";

function getTransitionDirection(fromPathname: string, toPathname: string): TransitionType {
  const fromLevel = getRouteLevel(fromPathname);
  const toLevel = getRouteLevel(toPathname);

  // Login → App  (level -1 → level 0+): slide-up (phone unlock feel)
  if (fromLevel === -1 && toLevel >= 0) return "slide-up";

  // App → Login (logging out / session expired): slide-down
  if (toLevel === -1) return "slide-down";

  // Dashboard switching (both level 0 but different paths): slide-up
  if (fromLevel === 0 && toLevel === 0 && fromPathname !== toPathname) {
    return "slide-up";
  }

  // Going deeper in the hierarchy → slide-left (forward)
  if (toLevel > fromLevel) return "slide-left";

  // Going up / backward → slide-right
  if (toLevel < fromLevel) return "slide-right";

  // Same level, different paths (e.g. Purchase table → Sales table) → slide-left
  return "slide-left";
}

// Patch document.startViewTransition once so every viewTransition: true navigation
// automatically gets the correct direction applied via CSS types + html class fallback.
function patchViewTransition(routerInstance: AnyRouter): void {
  if (typeof document === "undefined" || !document.startViewTransition) return;

  const original = document.startViewTransition.bind(document);

  document.startViewTransition = function (callbackOrOptions) {
    const fromPathname = routerInstance.state.location.pathname;
    const toPathname = (routerInstance.state as any).pendingLocation?.pathname ?? fromPathname;

    // Same pathname = search/filter/pagination update — no slide animation.
    if (fromPathname === toPathname) {
      return original(callbackOrOptions);
    }

    const direction = getTransitionDirection(fromPathname, toPathname);
    const htmlEl = document.documentElement;
    const vtClass = `vt-${direction}`;
    htmlEl.classList.add(vtClass);

    // Build argument with types array for Level 2 View Transitions API
    const arg =
      typeof callbackOrOptions === "function"
        ? { types: [direction], update: callbackOrOptions }
        : { types: [direction], ...callbackOrOptions };

    const transition = original(arg as Parameters<typeof original>[0]);
    transition.finished.finally(() => {
      htmlEl.classList.remove(vtClass);
    });
    return transition;
  };
}

// 3. Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const persistTimerRef = useRef<number | null>(null);

  // Patch startViewTransition once on mount so every navigation
  // automatically gets the correct slide direction.
  // The patch runs once intentionally — router is a stable singleton.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    patchViewTransition(router);
  }, []);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = window.setTimeout(() => {
        try {
          const state = dehydrate(queryClient);
          localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify({ state, timestamp: Date.now() }));
        } catch {
          // ignore storage errors
        }
      }, 500);
    });

    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClearQueryCache = () => {
      clearPersistedQueryCache();
      queryClient.clear();
    };
    window.addEventListener(CLEAR_QUERY_CACHE_EVENT, handleClearQueryCache);
    return () => window.removeEventListener(CLEAR_QUERY_CACHE_EVENT, handleClearQueryCache);
  }, []);

  const { setDeferredPrompt, setIsInstalled, setIsDesktop } = usePwaActions();

  useEffect(() => {
    const isDesktopSession = window.innerWidth >= 1024;
    setIsDesktop(isDesktopSession);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
    }

    if (isDesktopSession) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setDeferredPrompt(null);
        setIsInstalled(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.error("Service worker registration failed:", err);
        });
      }

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, [setDeferredPrompt, setIsInstalled, setIsDesktop]);

  return (
    // 4. Wrap the app with the QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <RouterProvider router={router} />
      </GlobalErrorBoundary>
      <GoeyToaster {...GOEY_TOASTER_CONFIG} />
    </QueryClientProvider>
  );
}

export default App;
