import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { authAPI, type LoginRequest } from '@/api/auth.service'
import { authKeys } from '@/features/auth/api/auth.queries'
import { useClearAuthError, useLoginAction, useSetAuthError } from '@/store/auth.store'

/**
 * Custom hook to manage the user login mutation.
 *
 * This hook bridges the UI, the backend service, and global state.
 * It uses individual atomic selectors from the auth store for maximum performance.
 */
export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Using individual atomic selectors as requested
  const login = useLoginAction()
  const setError = useSetAuthError()
  const clearError = useClearAuthError()

  return useMutation({
    /** Triggers the login API call */
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),

    /** Resets local/global errors when a new attempt begins */
    onMutate: () => {
      clearError()
    },

    /** Success Handler: Synchronizes global store, cache, and navigation */
    onSuccess: (response) => {
      if (response.success && response.data?.user) {
        // Sync the Zustand store
        login(response.data.user)

        // Sync the Query Cache (Blueprint)
        queryClient.setQueryData(authKeys.user(), response.data.user)

        // Kick off navigation to the root/dashboard
        navigate({ to: '/' })
      } else {
        setError('Login successful, but user profile was missing.')
      }
    },

    /** Failure Handler: Maps backend errors to the UI state */
    onError: (error: Error) => {
      setError(error.message || 'Authentication failed. Please check your credentials.')
    },
  })
}
