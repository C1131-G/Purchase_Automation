import 'goey-toast/styles.css'

import { dehydrate, hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { GoeyToaster } from 'goey-toast'
import { lazy, Suspense, useEffect, useRef } from 'react'

import { GlobalErrorBoundary } from '@/components/error-boundary'
import { GOEY_TOASTER_CONFIG } from '@/components/goey-toast.config'
import { routeTree } from '@/routeTree.gen'
import { QUERY_CACHE_KEY } from '@/shared/utils/query-cache-persistence'

const QUERY_CACHE_MAX_AGE = 30 * 60 * 1000
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null

// 1. Create a persistent QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const restoreQueryCache = () => {
  try {
    const raw = localStorage.getItem(QUERY_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { timestamp: number; state: unknown }
    if (!parsed?.state) return
    if (Date.now() - parsed.timestamp > QUERY_CACHE_MAX_AGE) {
      localStorage.removeItem(QUERY_CACHE_KEY)
      return
    }
    hydrate(queryClient, parsed.state)
  } catch {
    localStorage.removeItem(QUERY_CACHE_KEY)
  }
}

restoreQueryCache()

// 2. Create the router and inject the queryClient into its context
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

// 3. Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  const persistTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = window.setTimeout(() => {
        try {
          const state = dehydrate(queryClient)
          localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), state }))
        } catch {
          // ignore storage errors
        }
      }, 500)
    })

    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
      unsubscribe()
    }
  }, [])

  return (
    // 4. Wrap the app with the QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <RouterProvider router={router} />
      </GlobalErrorBoundary>
      <GoeyToaster {...GOEY_TOASTER_CONFIG} />
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  )
}

export default App
