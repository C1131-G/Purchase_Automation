import { createFileRoute, redirect } from '@tanstack/react-router'

import { authQueries } from '@/features/auth/api/auth.queries'
import { ShellLayout } from '@/features/layout/components/ShellLayout'
import { useAuthStore } from '@/store/auth/auth.store'

/**
 * ShellLayout: Persistent ERP frame managing sidebar, header, and content areas.
 * SECURITY: Handles initial hydration of auth state before rendering children.
 */
export const Route = createFileRoute('/_layout')({
  beforeLoad: async ({ context }) => {
    const authState = useAuthStore.getState()
    if (authState.isAuthenticated) return

    try {
      const user = await context.queryClient.ensureQueryData(authQueries.user())
      useAuthStore.getState().login(user)
      return
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: ShellLayout,
})
