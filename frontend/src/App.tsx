import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

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
  defaultPendingMs: 200,
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
