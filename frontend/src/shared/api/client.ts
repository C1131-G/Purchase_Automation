/** BASE_URL: Regional API gateway endpoint; defaults to localhost:4000. */
const BASE_URL: string = import.meta.env.VITE_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number | undefined;
  code: string | undefined;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = "ApiError";
    if (options?.status !== undefined) {
      this.status = options.status;
    }
    if (options?.code !== undefined) {
      this.code = options.code;
    }
  }
}

const readResponseErrorMessage = async (response: Response) => {
  const errorData = await response.json().catch(() => ({}));
  return (errorData as { message?: string })?.message;
};

const verifySessionState = async (): Promise<"active" | "expired" | "unavailable"> => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "GET",
    });

    if (response.status === 401) {
      return "expired";
    }
    if (!response.ok) {
      return "unavailable";
    }
    return "active";
  } catch {
    return "unavailable";
  }
};

/**
 * apiClient: Universal fetch wrapper with automatic base URL injection, session management, and 401 redirection.
 * Centralizes authentication logic and error normalization for all API communication.
 */
export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.body instanceof FormData) {
    delete mergedHeaders["Content-Type"];
  }

  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: mergedHeaders,
  };

  let response: Response;
  try {
    response = await fetch(url, defaultOptions);
  } catch {
    throw new ApiError("Unable to reach server. Please try again.", {
      code: "NETWORK",
    });
  }

  if (response.status === 401) {
    const isLoginRequest = path.toLowerCase().includes("login");
    const isAtLoginUI = window.location.pathname.includes("/login");
    const isAuthMeRequest = path.toLowerCase().includes("/auth/me");

    // Helper to check if user is in logout flow
    let isLoggingOut = false;
    try {
      const authStore = await import("@/store/auth/auth.store");
      ({ isLoggingOut } = authStore.useAuthStore.getState());
    } catch {
      // Store not available yet, continue with default handling
    }

    if (isLoginRequest) {
      throw new ApiError("Invalid credentials. Please verify your details.", {
        code: "INVALID_CREDENTIALS",
        status: 401,
      });
    }

    // On login page with auth/me request - suppress error, user needs to login
    // Also suppress during intentional logout to prevent flash of error
    if (isAtLoginUI || isLoggingOut) {
      if (isAuthMeRequest) {
        // Silent auth failure on login page - user needs to login, not an error condition
        throw new ApiError("Session expired. Please login again.", {
          code: "SESSION_EXPIRED",
          status: 401,
        });
      }
      // For other 401 on login page during logout, suppress silently
      throw new ApiError("", { code: "SILENT_LOGOUT", status: 401 });
    }

    if (isAuthMeRequest) {
      import("@/store/auth/auth.store").then((authModule) => {
        authModule.useAuthStore.getState().forceLogout();
      });
      throw new ApiError("Session expired. Please login again.", {
        code: "SESSION_ENDED",
        status: 401,
      });
    }

    const sessionState = await verifySessionState();
    if (sessionState === "expired") {
      import("@/store/auth/auth.store").then((authModule) => {
        authModule.useAuthStore.getState().forceLogout();
      });
      throw new ApiError("Session expired. Please login again.", {
        code: "SESSION_ENDED",
        status: 401,
      });
    }

    if (sessionState === "unavailable") {
      throw new ApiError("Server is unavailable. Please try again in a moment.", {
        code: "SERVER_UNAVAILABLE",
      });
    }

    throw new ApiError((await readResponseErrorMessage(response)) || "Unauthorized request.", {
      code: "UNAUTHORIZED",
      status: 401,
    });
  }

  if (!response.ok) {
    throw new ApiError(
      (await readResponseErrorMessage(response)) || "Something went wrong. Please try again later.",
      {
        code: "HTTP_ERROR",
        status: response.status,
      },
    );
  }

  return response.json();
}
