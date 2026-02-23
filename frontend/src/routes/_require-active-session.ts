import { redirect } from '@tanstack/react-router'

import { authAPI } from '@/features/auth/api/auth.service'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/store/auth/auth.store'

/**
 * requireActiveSession: Guard for routes requiring a verified backend user session.
 * Hydrates auth store on success; forces redirection to /login on failure.
 */
export const requireActiveSession = async () => {
  const authState = useAuthStore.getState()
  if (authState.isAuthenticated && authState.user) {
    return
  }

  try {
    const response = await authAPI.getMe()
    useAuthStore.getState().login(response.data.user)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      throw redirect({ to: '/login' })
    }
    throw error
  }
}
