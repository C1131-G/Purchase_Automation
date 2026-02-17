// BASE_URL: Regional API gateway endpoint; defaults to localhost:4000.
const BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// apiClient: Universal fetch wrapper with automatic base URL injection, session management, and 401 redirection.
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

    if (!isAtLoginUI) {
      Promise.all([import('@/store/auth/auth.store'), import('@/store/toast.store')]).then(
        ([authModule, toastModule]) => {
          toastModule.toast.warning('Session expired', 'Please login again.')
          authModule.useAuthStore.getState().forceLogout()
        },
      )
    } else {
      import('@/store/toast.store').then((toastModule) => {
        toastModule.toast.warning('Session expired', 'Please login again.')
      })
    }
    throw new Error('Session expired. Please login again.')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Something went wrong. Please try again later.')
  }

  return response.json()
}
