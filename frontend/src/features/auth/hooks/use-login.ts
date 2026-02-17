import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { authKeys } from '@/features/auth/api/auth.queries'
import { authAPI, type LoginRequest } from '@/features/auth/api/auth.service'
import { useClearAuthError, useLoginAction, useSetAuthError } from '@/store/auth/auth.store'

// useLogin: Custom hook bridging UI, backend auth API, and global store state.
export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Using individual atomic selectors as requested
  const login = useLoginAction()
  const setError = useSetAuthError()
  const clearError = useClearAuthError()

  return useMutation({
    // mutationFn: Triggers the login API call with credentials.
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),

    // onMutate: Resets local/global errors before new attempt.
    onMutate: () => {
      clearError()
    },

    // onSuccess: Synchronizes global store, cache, and navigation on success.
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

    // onError: Maps backend errors to UI state for user feedback.
    onError: (error: Error) => {
      setError(error.message || 'Authentication failed. Please check your credentials.')
    },
  })
}
