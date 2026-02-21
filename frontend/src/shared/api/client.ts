/** BASE_URL: Regional API gateway endpoint; defaults to localhost:4000. */
const BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * apiClient: Universal fetch wrapper with automatic base URL injection, session management, and 401 redirection.
 * Centralizes authentication logic and error normalization for all API communication.
 */
export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  const defaultOptions: RequestInit = {
    ...options,
    headers: mergedHeaders,
    credentials: 'include',
  }

  const response = await fetch(url, defaultOptions)

  if (response.status === 401) {
    const isLoginRequest = path.toLowerCase().includes('login')
    const isAtLoginUI = window.location.pathname.includes('/login')

    if (isLoginRequest) {
      throw new Error('Invalid credentials. Please verify your details.')
    }

    if (isAtLoginUI) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Session expired. Please login again.')
    }

    import('@/store/auth/auth.store').then((authModule) => {
      authModule.useAuthStore.getState().forceLogout()
    })
    throw new Error('Session expired. Please login again.')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Something went wrong. Please try again later.')
  }

  return response.json()
}
