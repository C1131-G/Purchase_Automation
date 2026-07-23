import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { IcUnreadCountPill } from "@/features/intercompany/components/ic-unread-badge";
import { cn } from "@/shared/utils/cn";

export type IcSectionNavActive = "notifications" | "retries";

const NOTIFICATIONS_SEARCH = {
  isRead: "all" as const,
  limit: 10,
  page: 1,
};

const RETRIES_SEARCH = {
  limit: 10,
  page: 1,
  status: "all" as const,
};

export interface IcSectionNavProps {
  active: IcSectionNavActive;
  /** Extra breadcrumb trail after the active page (e.g. "3 unread"). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Shared IC area breadcrumb + sub-nav (Notifications | Retries).
 */
export function IcSectionNav({ active, trailing, className }: IcSectionNavProps) {
  return (
    <nav
      aria-label="Intercompany"
      className={cn(
        "inline-flex min-w-0 flex-wrap items-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/50 px-3.5 py-1.5 text-xs font-medium text-zinc-600",
        className,
      )}
    >
      <span className="text-zinc-500">Intercompany</span>
      <ChevronRight className="size-3 shrink-0 text-zinc-300" aria-hidden />
      <Link
        to="/intercompany/notifications"
        search={NOTIFICATIONS_SEARCH}
        preload="intent"
        viewTransition
        aria-current={active === "notifications" ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 truncate transition-colors hover:text-blue-600",
          active === "notifications" ? "font-semibold text-zinc-800" : "text-zinc-500",
        )}
      >
        Notifications
        {active === "notifications" ? null : <IcUnreadCountPill />}
      </Link>
      <span className="text-zinc-300" aria-hidden>
        |
      </span>
      <Link
        to="/intercompany/retries"
        search={RETRIES_SEARCH}
        preload="intent"
        viewTransition
        aria-current={active === "retries" ? "page" : undefined}
        className={cn(
          "truncate transition-colors hover:text-blue-600",
          active === "retries" ? "font-semibold text-zinc-800" : "text-zinc-500",
        )}
      >
        Retries
      </Link>
      {trailing ? (
        <>
          <ChevronRight className="size-3 shrink-0 text-zinc-300" aria-hidden />
          {trailing}
        </>
      ) : null}
    </nav>
  );
}
