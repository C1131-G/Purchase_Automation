import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { NotFound } from '@/components/not-found'

/**
 * Root: Global application container.
 * THEME: Rigid Light-mode foundation (zinc-900 on white).
 * ARCHITECTURE: Context provider for QueryClient and TanStack Router Outlet.
 * TYPOGRAPHY: Enforces `font-outfit` as the industrial sans-serif baseline.
 */
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : null

function RootComponent() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-outfit selection:bg-blue-500/10 selection:text-blue-900 relative overflow-hidden">
      <main className="relative z-10">
        <Outlet />
      </main>

      {/* DevTools - Only visible in development */}
      {TanStackRouterDevtools ? (
        <Suspense fallback={null}>
          <TanStackRouterDevtools initialIsOpen={false} position="bottom-left" />
        </Suspense>
      ) : null}
    </div>
  )
}
