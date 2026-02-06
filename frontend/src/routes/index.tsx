import { createFileRoute, redirect } from '@tanstack/react-router'

import { useAuthStore } from '@/store/auth.store'

/**
 * Root Route Receptionist.
 *
 * Logic:
 * 1. Checks if the user is authenticated.
 * 2. If NO: Redirects to /login (Default Page).
 * 3. If YES: Redirects to /purchase/orders (Dashboard).
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()

    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }

    throw redirect({
      to: '/purchase/orders',
    })
  },
})
