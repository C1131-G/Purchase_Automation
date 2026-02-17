import { useMutation, useQueryClient } from '@tanstack/react-query'

import { clearPersistedQueryCache } from '@/shared/utils/query-cache-persistence'
import { useLogoutAction } from '@/store/auth/auth.store'

/**
 * Custom hook to manage the user logout mutation.
 *
 * Follows the standard pattern:
 * 1. Calls the logout API (fire and forget).
 * 2. Clears the React Query cache.
 * 3. Triggers the Zustand logout action to clear state and redirect.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const logoutAction = useLogoutAction()

  return useMutation({
    mutationFn: async () => {
      // 1. Clear in-memory + persisted cache before redirect to prevent cross-user stale hydrate.
      clearPersistedQueryCache()
      queryClient.clear()

      // 2. Single source logout flow (includes best-effort backend call)
      await logoutAction()
    },
  })
}
