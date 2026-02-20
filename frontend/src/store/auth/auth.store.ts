import { create } from 'zustand'

import { authAPI, type User } from '@/features/auth/api/auth.service'

// AuthState: Defines session state and available store actions.
type AuthState = {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  logoutReason: 'user' | 'session_ended' | null

  // Actions
  login: (userData: User) => void
  logout: () => Promise<void>
  forceLogout: () => void
  setError: (error: string | null) => void
  clearError: () => void
}

// Global Authentication Store (Zustand): Manages session state and UI synchronization.
export const useAuthStore = create<AuthState>((set) => {
  // Create a broadcast channel for cross-tab synchronization
  const authChannel = new BroadcastChannel('auth_channel')

  // Listen for logout events from other tabs
  authChannel.onmessage = (event) => {
    if (event.data.type === 'LOGOUT') {
      set({ user: null, isAuthenticated: false, isLoading: false, logoutReason: 'session_ended' })
    }
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    logoutReason: null,

    // login: Updates state with user data and marks as authenticated.
    login: (userData) =>
      set({
        user: userData,
        isAuthenticated: true,
        error: null,
        logoutReason: null,
      }),

    // logout: Resets authentication state and clears user data via API.
    logout: async () => {
      // Prevent duplicate logout races that can cause UI flicker.
      const { isLoading } = useAuthStore.getState()
      if (isLoading) return

      // 1. Notify other tabs first
      authChannel.postMessage({ type: 'LOGOUT' })

      // 2. Clear local state
      set({
        isLoading: true,
        logoutReason: 'user',
      })

      // 3. Attempt to notify the backend (best-effort)
      try {
        await authAPI.logout()
      } catch (error) {
        console.error('Logout API failed:', error)
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        logoutReason: 'user',
      })
    },

    // forceLogout: Clears local state only (avoids recursive logout calls on 401).
    forceLogout: () => {
      authChannel.postMessage({ type: 'LOGOUT' })
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        logoutReason: 'session_ended',
      })
    },

    // setError: Sets a global authentication error message.
    setError: (error) => set({ error }),

    // clearError: Clears any existing authentication error messages.
    clearError: () => set({ error: null }),
  }
})

// --- State Selectors ---

// useAuthError: Selector for global error messages.
export const useAuthError = () => useAuthStore((state) => state.error)

// --- Action Selectors (Atomic) ---

// useLoginAction: Hook to retrieve atomic login action.
export const useLoginAction = () => useAuthStore((state) => state.login)

// useLogoutAction: Hook to retrieve atomic logout action.
export const useLogoutAction = () => useAuthStore((state) => state.logout)

// useSetAuthError: Hook to retrieve atomic error setter.
export const useSetAuthError = () => useAuthStore((state) => state.setError)

// useClearAuthError: Hook to retrieve atomic error clearer.
export const useClearAuthError = () => useAuthStore((state) => state.clearError)
