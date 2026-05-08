import "goey-toast/styles.css";
import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
