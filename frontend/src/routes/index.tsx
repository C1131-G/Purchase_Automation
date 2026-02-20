import { createFileRoute, redirect } from '@tanstack/react-router'

import { useAuthStore } from '@/store/auth/auth.store'

// Entry Receptionist: Analyzes auth state to route users to /login or the /purchase orders dashboard.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
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
    throw redirect({ to: '/login' })
  },
})
