import { createFileRoute, redirect } from '@tanstack/react-router'

import { useAuthStore } from '@/store/auth/auth.store'

/**
 * EntryReceptionist: Root redirect logic.
 * Analyzes auth state to switch between dashboard and login view.
 */
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
