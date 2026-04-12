/** BASE_URL: Regional API gateway endpoint; defaults to localhost:4000. */
const BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export class ApiError extends Error {
  status: number | undefined
  code: string | undefined

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.name = 'ApiError'
    if (options?.status !== undefined) this.status = options.status
    if (options?.code !== undefined) this.code = options.code
  }
}

const readResponseErrorMessage = async (response: Response) => {
  const errorData = await response.json().catch(() => ({}))
  return (errorData as { message?: string })?.message
}

const verifySessionState = async (): Promise<'active' | 'expired' | 'unavailable'> => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status === 401) return 'expired'
    if (!response.ok) return 'unavailable'
    return 'active'
  } catch {
    return 'unavailable'
  }
}

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

  let response: Response
  try {
    response = await fetch(url, defaultOptions)
  } catch {
    throw new ApiError('Unable to reach server. Please try again.', { code: 'NETWORK' })
  }

  if (response.status === 401) {
    const isLoginRequest = path.toLowerCase().includes('login')
    const isAtLoginUI = window.location.pathname.includes('/login')

    if (isLoginRequest) {
      throw new ApiError('Invalid credentials. Please verify your details.', {
        status: 401,
        code: 'INVALID_CREDENTIALS',
      })
    }

    if (isAtLoginUI) {
      throw new ApiError(
        (await readResponseErrorMessage(response)) || 'Session expired. Please login again.',
        {
          status: 401,
          code: 'UNAUTHORIZED',
        },
      )
    }

    const isAuthMeRequest = path.toLowerCase().includes('/auth/me')
    if (isAuthMeRequest) {
      import('@/store/auth/auth.store').then((authModule) => {
        authModule.useAuthStore.getState().forceLogout()
      })
      throw new ApiError('Session expired. Please login again.', {
        status: 401,
        code: 'SESSION_ENDED',
      })
    }

    const sessionState = await verifySessionState()
    if (sessionState === 'expired') {
      import('@/store/auth/auth.store').then((authModule) => {
        authModule.useAuthStore.getState().forceLogout()
      })
      throw new ApiError('Session expired. Please login again.', {
        status: 401,
        code: 'SESSION_ENDED',
      })
    }

    if (sessionState === 'unavailable') {
      throw new ApiError('Server is unavailable. Please try again in a moment.', {
        code: 'SERVER_UNAVAILABLE',
      })
    }

    throw new ApiError((await readResponseErrorMessage(response)) || 'Unauthorized request.', {
      status: 401,
      code: 'UNAUTHORIZED',
    })
  }

  if (!response.ok) {
    throw new ApiError(
      (await readResponseErrorMessage(response)) || 'Something went wrong. Please try again later.',
      {
        status: response.status,
        code: 'HTTP_ERROR',
      },
    )
  }

  return response.json()
}
