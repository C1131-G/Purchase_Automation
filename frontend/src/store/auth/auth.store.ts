import { authAPI } from "@/features/auth/api/auth.service";
import type { User } from "@/features/auth/api/auth.service";
import { requestQueryCacheClear } from "@/shared/utils/query-cache-persistence";
import { createAppStore, type AppStoreCreator } from "@/store/lib/create-store";

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

function buildAuthCreator(authChannel: BroadcastChannel): AppStoreCreator<AuthState> {
  return (set, get) => {
    authChannel.onmessage = (event) => {
      if (event.data.type === "LOGOUT") {
        requestQueryCacheClear();
        set(
          {
            isAuthenticated: false,
            isLoading: false,
            isLoggingOut: false,
            logoutReason: "session_ended",
            user: null,
          },
          false,
          "auth/channel-logout",
        );
      }
    };

    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      logoutReason: null,
      isLoggingOut: false,

      login: (userData) =>
        set(
          {
            error: null,
            isAuthenticated: true,
            isLoggingOut: false,
            logoutReason: null,
            user: userData,
          },
          false,
          "auth/login",
        ),

      logout: async () => {
        if (get().isLoading) {
          return;
        }

        set({ isLoggingOut: true }, false, "auth/logout/start");
        authChannel.postMessage({ type: "LOGOUT" });
        set(
          {
            isLoading: true,
            logoutReason: "user",
          },
          false,
          "auth/logout/loading",
        );

        try {
          await authAPI.logout();
        } catch (error) {
          console.error("Logout API failed:", error);
        }

        set(
          {
            isAuthenticated: false,
            isLoading: false,
            isLoggingOut: false,
            logoutReason: "user",
            user: null,
          },
          false,
          "auth/logout/complete",
        );
      },

      forceLogout: () => {
        authChannel.postMessage({ type: "LOGOUT" });
        requestQueryCacheClear();
        set(
          {
            isAuthenticated: false,
            isLoading: false,
            isLoggingOut: false,
            logoutReason: "session_ended",
            user: null,
          },
          false,
          "auth/forceLogout",
        );
      },

      setError: (error) => set({ error }, false, "auth/setError"),
      clearError: () => set({ error: null }, false, "auth/clearError"),
    };
  };
}

/** Pure creator for isolated unit tests. */
export function createAuthStore(options?: { channelName?: string }) {
  const channelName = options?.channelName ?? "auth_channel";
  const authChannel = new BroadcastChannel(channelName);
  return createAppStore<AuthState>({ name: "auth-store" }, buildAuthCreator(authChannel));
}

const authStoreApi = createAuthStore();

// Global Authentication Store (Zustand): Manages session state and UI synchronization.
export const useAuthStore = authStoreApi.useStore;
export const createAuthStoreInstance = authStoreApi.createStore;

// --- State Selectors ---

export const useAuthError = () => useAuthStore((state) => state.error);

// --- Action Selectors (Atomic) ---

export const useLoginAction = () => useAuthStore((state) => state.login);
export const useLogoutAction = () => useAuthStore((state) => state.logout);
export const useSetAuthError = () => useAuthStore((state) => state.setError);
export const useClearAuthError = () => useAuthStore((state) => state.clearError);
