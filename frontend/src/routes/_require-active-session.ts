import { redirect } from '@tanstack/react-router'

import { authAPI } from '@/features/auth/api/auth.service'
import { useAuthStore } from '@/store/auth/auth.store'

/**
 * requireActiveSession: Guard for routes requiring a verified backend user session.
 * Hydrates auth store on success; forces redirection to /login on failure.
 */
export const requireActiveSession = async () => {
  try {
    const response = await authAPI.getMe()
    useAuthStore.getState().login(response.data.user)
  } catch {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
    throw redirect({ to: '/login' })
  }
}
