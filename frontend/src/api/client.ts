/**
 * Base URL for the backend API.
 * Defaults to localhost:4000 if not provided via environment variables.
 */
const BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Universal API Client.
 *
 * A wrapper around the native `fetch` API that provides:
 * 1. Automatic base URL injection.
 * 2. Default JSON headers.
 * 3. Session management (`credentials: 'include'` for cookies).
 * 4. Automatic redirection to login on 401 (Unauthorized) errors.
 * 5. Robust error handling for non-OK responses.
 *
 * @template T - The expected return type of the API response.
 * @param path - The API endpoint path (e.g., '/api/v1/auth/me').
 * @param options - Standard fetch options to override defaults.
 */
export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`

  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // CRITICAL: Required for cross-origin session cookies
  }

  const response = await fetch(url, defaultOptions)

  // Handle Session Expiration
  if (response.status === 401) {
    // Only redirect to login if we aren't already there to prevent loops
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
    throw new Error('Session expired. Please login again.')
  }

  // Handle API Errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Something went wrong. Please try again later.')
  }

  return response.json()
}
