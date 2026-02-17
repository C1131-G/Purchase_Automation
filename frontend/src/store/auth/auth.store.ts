import { create } from 'zustand'

import { authAPI, type User } from '@/features/auth/api/auth.service'

// AuthState: Defines session state and available store actions.
type AuthState = {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

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

    // login: Updates state with user data and marks as authenticated.
    login: (userData) =>
      set({
        user: userData,
        isAuthenticated: true,
        error: null,
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
        user: null,
        isAuthenticated: false,
        isLoading: true,
      })

      // 3. Allow UI to render a short fade-out transition before redirect.
      await new Promise((resolve) => {
        window.setTimeout(resolve, 180)
      })

      // 4. Redirect to login.
      const isAtLogin = window.location.pathname.includes('/login')
      if (!isAtLogin) {
        window.location.replace('/login')
      }

      // 5. Attempt to notify the backend (best-effort)
      try {
        await authAPI.logout()
      } catch (error) {
        console.error('Logout API failed:', error)
      }
      set({ isLoading: false })
    },

    // forceLogout: Clears local state only (avoids recursive logout calls on 401).
    forceLogout: () => {
      authChannel.postMessage({ type: 'LOGOUT' })
      set({ user: null, isAuthenticated: false, isLoading: false })
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login?reason=session_ended')
      }
    },

    // setError: Sets a global authentication error message.
    setError: (error) => set({ error }),

    // clearError: Clears any existing authentication error messages.
    clearError: () => set({ error: null }),
  }
})

// --- State Selectors ---

// useUser: Selector for current user profile.
export const useUser = () => useAuthStore((state) => state.user)

// useIsAuthenticated: Selector for auth status.
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)

// useAuthError: Selector for global error messages.
export const useAuthError = () => useAuthStore((state) => state.error)

// --- Action Selectors (Atomic) ---

// useLoginAction: Hook to retrieve atomic login action.
export const useLoginAction = () => useAuthStore((state) => state.login)

// useLogoutAction: Hook to retrieve atomic logout action.
export const useLogoutAction = () => useAuthStore((state) => state.logout)
export const useForceLogoutAction = () => useAuthStore((state) => state.forceLogout)

// useSetAuthError: Hook to retrieve atomic error setter.
export const useSetAuthError = () => useAuthStore((state) => state.setError)

// useClearAuthError: Hook to retrieve atomic error clearer.
export const useClearAuthError = () => useAuthStore((state) => state.clearError)
