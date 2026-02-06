import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

/**
 * Root Layout Component.
 *
 * Reverted to Light Theme globally.
 * (Sidebar will maintain its independent dark color scheme).
 */
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-outfit selection:bg-blue-500/10 selection:text-blue-900 relative overflow-hidden">
      <main className="relative z-10">
        <Outlet />
      </main>

      {/* DevTools - Only visible in development */}
      {import.meta.env.DEV && (
        <TanStackRouterDevtools initialIsOpen={false} position="bottom-left" />
      )}
    </div>
  )
}
