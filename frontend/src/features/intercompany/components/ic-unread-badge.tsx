import { Bell } from "lucide-react";

import { useIcUnreadCount } from "@/features/intercompany/api/intercompany.queries";
import { cn } from "@/shared/utils/cn";

/** Cap badge digits for dense chrome; API still returns the raw count. */
function formatUnreadBadge(count: number): string {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

/**
 * Compact unread indicator for Intercompany → Notifications sidebar / section nav.
 * Small bell + total count from TanStack Query only (never Zustand).
 * Renders nothing when count is 0.
 */
export function IcUnreadCountPill({ className }: { className?: string }) {
  const unreadQuery = useIcUnreadCount(true);
  const count = unreadQuery.data?.data.count ?? 0;
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn(
        "ml-auto inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-blue-700 tabular-nums",
        className,
      )}
      aria-label={`${count} unread notifications`}
    >
      <Bell className="size-3 shrink-0" aria-hidden />
      <span>{formatUnreadBadge(count)}</span>
    </span>
  );
}
