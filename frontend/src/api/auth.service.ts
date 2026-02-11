import { apiClient } from '@/api/client'

/**
 * Represents a business organization/company fetched from the backend.
 */
export interface Organization {
  dbName: string
  companyName: string
  dbServer: string
}

/**
 * Payload required for the user authentication request.
 */
export interface LoginRequest {
  username: string
  password: string
  companyDB: string
}

/**
 * Represents the core user profile data returned by the backend.
 */
export interface User {
  userName: string
  dbName: string
  dbServer: string
}

/**
 * API service for management of organization data.
 */
export const OrganizationsAPI = {
  /**
   * Fetches the list of all available organizations for the portal.
   */
  getAll: async () => {
    return apiClient<{ success: boolean; data: Organization[] }>('/api/v1/organizations')
  },
}

/**
 * API service for authentication and user session management.
 */
export const authAPI = {
  /**
   * Authenticates a user with the provided credentials.
   */
  login: (credentials: LoginRequest) =>
    apiClient<{ success: boolean; data: { user: User } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  /**
   * Retrieves the current authenticated user's profile based on the session cookie.
   */
  getMe: () => apiClient<{ success: boolean; data: { user: User } }>('/api/v1/auth/me'),

  /**
   * Terminates the user session on the backend.
   */
  logout: () =>
    apiClient<{ success: boolean; message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    }),
}
