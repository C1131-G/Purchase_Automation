import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'

import { NotFound } from '@/components/not-found'
import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'

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

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isRouterLoading = useRouterState({ select: (state) => state.isLoading })

  const isCreateOrEditPath =
    pathname === '/purchase/create-order' ||
    pathname === '/sales/create-order' ||
    pathname === '/sales/create-ar-invoice' ||
    pathname === '/purchase/create-grpo' ||
    (pathname.startsWith('/purchase/orders/') && pathname.endsWith('/edit')) ||
    (pathname.startsWith('/sales/orders/') && pathname.endsWith('/edit')) ||
    (pathname.startsWith('/sales/ar-invoice/') && pathname.endsWith('/edit')) ||
    (pathname.startsWith('/purchase/grpo/') && pathname.endsWith('/edit'))

  const shouldShowCreatePendingSkeleton = isRouterLoading && isCreateOrEditPath

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-outfit selection:bg-blue-500/10 selection:text-blue-900 relative overflow-hidden">
      <main className="relative z-10">
        {shouldShowCreatePendingSkeleton ? <CreatePageRouteSkeleton /> : <Outlet />}
      </main>
    </div>
  )
}
