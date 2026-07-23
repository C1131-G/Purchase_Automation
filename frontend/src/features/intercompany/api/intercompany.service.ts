/** Intercompany API client — shell only in P4 (health + typed contracts). */
import type { z } from "zod";

import type {
  icHealthResponseSchema,
  icUnreadCountResponseSchema,
} from "@/features/intercompany/schemas/intercompany-api.schema";
import { apiClient } from "@/shared/api/client";

import { IC_API_PATHS } from "./intercompany.paths";

export type IcHealthResponse = z.infer<typeof icHealthResponseSchema>;
export type IcUnreadCountResponse = z.infer<typeof icUnreadCountResponseSchema>;

export const intercompanyAPI = {
  /**
   * Module liveness probe.
   * `GET /api/v1/ic/health`
   */
  getHealth: () => apiClient<IcHealthResponse>(IC_API_PATHS.health),

  /**
   * Unread notification count for header badge (P8).
   * Path reserved; do not call until backend exposes the route.
   */
  getUnreadCount: () => apiClient<IcUnreadCountResponse>(IC_API_PATHS.notificationsUnreadCount),
};

/** Named export for plan T4.3 / docs. */
export const getIcHealth = (): Promise<IcHealthResponse> => intercompanyAPI.getHealth();
