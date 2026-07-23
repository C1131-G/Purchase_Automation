import { useQuery } from "@tanstack/react-query";

import { intercompanyAPI } from "./intercompany.service";

export const intercompanyKeys = {
  all: ["intercompany"] as const,
  health: () => [...intercompanyKeys.all, "health"] as const,
  /** P8: list + unread count keys live here when APIs exist. */
  notifications: () => [...intercompanyKeys.all, "notifications"] as const,
  unreadCount: () => [...intercompanyKeys.notifications(), "unread-count"] as const,
};

/** Optional health query for the shell placeholder page. */
export function useIcHealth(enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => intercompanyAPI.getHealth(),
    queryKey: intercompanyKeys.health(),
    retry: false,
    staleTime: 60_000,
  });
}
