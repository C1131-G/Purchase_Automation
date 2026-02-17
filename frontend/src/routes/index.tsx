import { createFileRoute, redirect } from '@tanstack/react-router'

import { authQueries } from '@/features/auth/api/auth.queries'
import { useAuthStore } from '@/store/auth/auth.store'

// Entry Receptionist: Analyzes auth state to route users to /login or the /purchase orders dashboard.
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const { isAuthenticated } = useAuthStore.getState()

    if (isAuthenticated) {
      throw redirect({
        to: '/purchase/orders',
        search: {
          page: 1,
          limit: 10,
        },
      })
    }

    try {
      const user = await context.queryClient.ensureQueryData(authQueries.user())
      useAuthStore.getState().login(user)
      throw redirect({
        to: '/purchase/orders',
        search: {
          page: 1,
          limit: 10,
        },
      })
    } catch {
      throw redirect({ to: '/login' })
    }
  },
})
