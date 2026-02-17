import { redirect } from '@tanstack/react-router'

import { authAPI } from '@/features/auth/api/auth.service'
import { useAuthStore } from '@/store/auth/auth.store'

export const requireActiveSession = async () => {
  try {
    const response = await authAPI.getMe()
    useAuthStore.getState().login(response.data.user)
  } catch {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
    throw redirect({ to: '/login' })
  }
}
