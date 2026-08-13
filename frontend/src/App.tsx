import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef } from "react";

import { GlobalErrorBoundary } from "@/components/error-boundary";
import { routeTree } from "@/routeTree.gen";
import {
  CLEAR_QUERY_CACHE_EVENT,
  clearPersistedQueryCache,
  QUERY_CACHE_KEY,
  shouldPersistQueryKey,
} from "@/shared/utils/query-cache-persistence";
import { type BeforeInstallPromptEvent, usePwaActions } from "@/store/pwa/pwa.store";

const QUERY_CACHE_MAX_AGE = 30 * 60 * 1000;

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("@tanstack/react-query-devtools");
      return { default: module.ReactQueryDevtools };
    })
  : undefined;

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

function DefaultPendingComponent() {
  return (
    <div
      className="flex h-dvh w-full items-center justify-center bg-linen-50"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading page</span>
      <div className="size-5 animate-spin rounded-full border-2 border-linen-300 border-t-teal-600" />
    </div>
  );
}

// 2. Create the router and inject the queryClient into its context
const router = createRouter({
  context: {
    queryClient,
  },
  routeTree,
  // Cached back/forward navigation can briefly wait on route bookkeeping. Keep
  // the current page visible and reserve a full skeleton for genuinely cold loads.
  defaultPendingMs: 1000,
  defaultPendingMinMs: 300,
  defaultPendingComponent: DefaultPendingComponent,
  // View Transitions caused white intermediate frames on heavy pages.
  defaultViewTransition: false,
  defaultPreload: "intent",
  defaultPreloadDelay: 0,
});

// 3. Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = window.setTimeout(() => {
        try {
          // Whitelist only auth + static master lookups (Phase 4) — not full dehydrate.
          const state = dehydrate(queryClient, {
            shouldDehydrateQuery: (query) => {
              if (query.state.status !== "success") {
                return false;
              }
              return shouldPersistQueryKey(query.queryKey);
            },
          });
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
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}

export default App;
