/** Auth Service: Low-level API client for login, logout, and token management. */
import type { z } from "zod";

import type {
  authUserResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  organizationSchema,
  organizationsResponseSchema,
  userSchema,
} from "@/features/auth/schemas/auth-api.schema";
import { apiClient } from "@/shared/api/client";

export type Organization = z.infer<typeof organizationSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type User = z.infer<typeof userSchema>;

export const OrganizationsAPI = {
  getAll: async () =>
    apiClient<z.infer<typeof organizationsResponseSchema>>("/api/v1/organizations"),
};

export const authAPI = {
  getMe: () => apiClient<z.infer<typeof authUserResponseSchema>>("/api/v1/auth/me"),
  login: (credentials: LoginRequest) =>
    apiClient<z.infer<typeof authUserResponseSchema>>("/api/v1/auth/login", {
      body: JSON.stringify(credentials),
      method: "POST",
    }),
  logout: () =>
    apiClient<z.infer<typeof logoutResponseSchema>>("/api/v1/auth/logout", {
      method: "POST",
    }),
};
