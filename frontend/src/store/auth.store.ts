import { create } from 'zustand'

import { authAPI } from '@/api/auth.service'

/**
 * Represents the authenticated user's profile information.
 */
interface User {
  userName: string
  dbName: string
  dbServer: string
}

/**
 * Defines the state and actions available in the Authentication Store.
 */
interface AuthState {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (userData: User) => void
  logout: () => Promise<void>
  setError: (error: string | null) => void
  clearError: () => void
}

/**
 * Global Authentication Store managed by Zustand.
 * Handles user session state and authentication-related UI messages.
 */
export const useAuthStore = create<AuthState>((set) => {
  // Create a broadcast channel for cross-tab synchronization
  const authChannel = new BroadcastChannel('auth_channel')

  // Listen for logout events from other tabs
  authChannel.onmessage = (event) => {
    if (event.data.type === 'LOGOUT') {
      set({ user: null, isAuthenticated: false })
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?reason=session_ended'
      }
    }
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    /** Updates state with user data and marks as authenticated */
    login: (userData) =>
      set({
        user: userData,
        isAuthenticated: true,
        error: null,
      }),

    /** Resets authentication state and clears user data */
    logout: async () => {
      // 1. Notify other tabs first
      authChannel.postMessage({ type: 'LOGOUT' })

      // 2. Clear local state
      set({
        user: null,
        isAuthenticated: false,
      })

      // 3. Attempt to notify the backend (fire and forget)
      try {
        await authAPI.logout()
      } catch (error) {
        console.error('Logout API failed:', error)
      }

      // 4. Redirect to login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    },

    /** Sets a global authentication error message */
    setError: (error) => set({ error }),

    /** Clears any existing authentication error messages */
    clearError: () => set({ error: null }),
  }
})

// --- State Selectors ---

/** Selector for the current user profile */
export const useUser = () => useAuthStore((state) => state.user)

/** Selector for authentication status */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)

/** Selector for global authentication error messages */
export const useAuthError = () => useAuthStore((state) => state.error)

// --- Action Selectors (Atomic) ---

/** Individual hook to get the login action */
export const useLoginAction = () => useAuthStore((state) => state.login)

/** Individual hook to get the logout action */
export const useLogoutAction = () => useAuthStore((state) => state.logout)

/** Individual hook to get the error setting action */
export const useSetAuthError = () => useAuthStore((state) => state.setError)

/** Individual hook to get the error clearing action */
export const useClearAuthError = () => useAuthStore((state) => state.clearError)
