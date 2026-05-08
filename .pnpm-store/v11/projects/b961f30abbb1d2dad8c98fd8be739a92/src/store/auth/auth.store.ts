import { create } from "zustand";

import { authAPI } from "@/features/auth/api/auth.service";
import type { User } from "@/features/auth/api/auth.service";
import { requestQueryCacheClear } from "@/shared/utils/query-cache-persistence";

// AuthState: Defines session state and available store actions.
interface AuthState {
  /** Current authorized user. */
  user: User | null;
  /** Flag for active authentication session. */
  isAuthenticated: boolean;
  /** Loading state for async auth transitions. */
  isLoading: boolean;
  /** error: Holds global authentication error messages. */
  error: string | null;
  /** logoutReason: Context for UI redirects/toasts. */
  logoutReason: "user" | "session_ended" | null;
  /** Flag to indicate logout is in progress (used to suppress 401 errors). */
  isLoggingOut: boolean;

  // Actions
  login: (userData: User) => void;
  logout: () => Promise<void>;
  forceLogout: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Global Authentication Store (Zustand): Manages session state and UI synchronization.
export const useAuthStore = create<AuthState>((set) => {
  // Create a broadcast channel for cross-tab synchronization
  const authChannel = new BroadcastChannel("auth_channel");

  // Listen for logout events from other tabs
  authChannel.onmessage = (event) => {
    if (event.data.type === "LOGOUT") {
      requestQueryCacheClear();
      set({
        isAuthenticated: false,
        isLoading: false,
        isLoggingOut: false,
        logoutReason: "session_ended",
        user: null,
      });
    }
  };

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    logoutReason: null,
    isLoggingOut: false,

    // login: Updates state with user data and marks as authenticated.
    login: (userData) =>
      set({
        error: null,
        isAuthenticated: true,
        isLoggingOut: false,
        logoutReason: null,
        user: userData,
      }),

    // logout: Resets authentication state and clears user data via API.
    logout: async () => {
      // Prevent duplicate logout races that can cause UI flicker.
      const { isLoading } = useAuthStore.getState();
      if (isLoading) {
        return;
      }

      // 1. Mark logout in progress to suppress 401 errors
      set({ isLoggingOut: true });

      // 2. Notify other tabs first
      authChannel.postMessage({ type: "LOGOUT" });

      // 3. Clear local state
      set({
        isLoading: true,
        logoutReason: "user",
      });

      // 4. Attempt to notify the backend (best-effort)
      try {
        await authAPI.logout();
      } catch (error) {
        console.error("Logout API failed:", error);
      }
      set({
        isAuthenticated: false,
        isLoading: false,
        isLoggingOut: false,
        logoutReason: "user",
        user: null,
      });
    },

    // forceLogout: Clears local state only (avoids recursive logout calls on 401).
    forceLogout: () => {
      authChannel.postMessage({ type: "LOGOUT" });
      requestQueryCacheClear();
      set({
        isAuthenticated: false,
        isLoading: false,
        isLoggingOut: false,
        logoutReason: "session_ended",
        user: null,
      });
    },

    // setError: Sets a global authentication error message.
    setError: (error) => set({ error }),

    // clearError: Clears any existing authentication error messages.
    clearError: () => set({ error: null }),
  };
});

// --- State Selectors ---

// useAuthError: Selector for global error messages.
export const useAuthError = () => useAuthStore((state) => state.error);

// --- Action Selectors (Atomic) ---

// useLoginAction: Hook to retrieve atomic login action.
export const useLoginAction = () => useAuthStore((state) => state.login);

// useLogoutAction: Hook to retrieve atomic logout action.
export const useLogoutAction = () => useAuthStore((state) => state.logout);

// useSetAuthError: Hook to retrieve atomic error setter.
export const useSetAuthError = () => useAuthStore((state) => state.setError);

// useClearAuthError: Hook to retrieve atomic error clearer.
export const useClearAuthError = () => useAuthStore((state) => state.clearError);
