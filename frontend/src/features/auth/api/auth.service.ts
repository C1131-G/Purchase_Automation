/** Auth Service: Low-level API client for login, logout, and token management. */
import { z } from 'zod'

import {
  authUserResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  organizationSchema,
  organizationsResponseSchema,
  userSchema,
} from '@/features/auth/schemas/auth-api.schema'
import { apiClient } from '@/shared/api/client'

export type Organization = z.infer<typeof organizationSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type User = z.infer<typeof userSchema>

export const OrganizationsAPI = {
  getAll: async () => {
    return apiClient<z.infer<typeof organizationsResponseSchema>>('/api/v1/organizations')
  },
}

export const authAPI = {
  login: (credentials: LoginRequest) =>
    apiClient<z.infer<typeof authUserResponseSchema>>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => apiClient<z.infer<typeof authUserResponseSchema>>('/api/v1/auth/me'),
  logout: () =>
    apiClient<z.infer<typeof logoutResponseSchema>>('/api/v1/auth/logout', {
      method: 'POST',
    }),
}
