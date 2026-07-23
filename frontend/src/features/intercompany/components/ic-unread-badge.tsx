import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { useIcUnreadCount } from "@/features/intercompany/api/intercompany.queries";
import { cn } from "@/shared/utils/cn";

const NOTIFICATIONS_SEARCH = {
  isRead: "all" as const,
  limit: 10,
  page: 1,
};

/** Cap badge digits for dense chrome; API still returns the raw count. */
function formatUnreadBadge(count: number): string {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

export interface IcUnreadBadgeProps {
  className?: string;
  /** Icon-only (sidebar collapsed) vs label-friendly spacing. */
  compact?: boolean;
}

/**
 * Shell chrome control for session-company IC unread notifications.
 * Count comes from TanStack Query only (never Zustand).
 */
export function IcUnreadBadge({ className, compact = false }: IcUnreadBadgeProps) {
  const unreadQuery = useIcUnreadCount(true);
  const count = unreadQuery.data?.data.count ?? 0;
  const showBadge = count > 0;
  const label = showBadge
    ? `Intercompany notifications, ${count} unread`
    : "Intercompany notifications, none unread";

  return (
    <Link
      to="/intercompany/notifications"
      search={NOTIFICATIONS_SEARCH}
      preload="intent"
      viewTransition
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl border border-zinc-200/60 bg-white text-zinc-600 transition-colors duration-150",
        "hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50",
        compact ? "size-9" : "size-9",
        className,
      )}
    >
      <Bell className="size-4" aria-hidden />
      {showBadge ? (
        <span
          className={cn(
            "absolute -right-1 -top-1 inline-flex min-w-4.5 items-center justify-center rounded-full bg-blue-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums shadow-sm ring-2 ring-white",
          )}
          aria-hidden
        >
          {formatUnreadBadge(count)}
        </span>
      ) : null}
    </Link>
  );
}

/** Compact numeric pill for sidebar sub-nav (no extra link). */
export function IcUnreadCountPill({ className }: { className?: string }) {
  const unreadQuery = useIcUnreadCount(true);
  const count = unreadQuery.data?.data.count ?? 0;
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums",
        className,
      )}
      aria-hidden
    >
      {formatUnreadBadge(count)}
    </span>
  );
}
