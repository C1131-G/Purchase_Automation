import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface BreadcrumbItem {
  label: string;
  to: string;
  search?: Record<string, unknown>;
  onMouseEnter?: () => void;
}

interface CreatePageWrapperProps {
  /** @deprecated section is derived from dashboardUrl automatically */
  dashboardName?: string;
  dashboardUrl: string; // e.g., "/dashboard"
  breadcrumbParent: BreadcrumbItem;
  pageTitle: string;
  editError?: string | null;
  topActions?: ReactNode;
  children: ReactNode;
}

/**
 * CreatePageWrapper: Unified layout wrapper for all entity creation/edit pages.
 * Handles consistent spacing, breadcrumbs, and error boundaries for edit hydration.
 */
export function CreatePageWrapper({
  dashboardUrl,
  breadcrumbParent,
  pageTitle,
  editError,
  topActions,
  children,
}: CreatePageWrapperProps) {
  if (editError) {
    return (
      <div className="w-full bg-zinc-50 p-3 pb-20">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {editError}
        </p>
      </div>
    );
  }

  let section = "Purchase";
  if (breadcrumbParent.to.startsWith("/sales") || dashboardUrl.includes("sales")) {
    section = "Sales";
  } else if (dashboardUrl.includes("inventory")) {
    section = "Inventory";
  } else if (breadcrumbParent.to.startsWith("/purchase") || dashboardUrl.includes("purchase")) {
    section = "Purchase";
  }

  return (
    <div className="relative h-full w-full bg-zinc-50 p-3 pb-20 overflow-y-auto">
      {/* Top Actions - Positioned absolute top-right */}
      {topActions && <div className="absolute right-3 top-3 z-10">{topActions}</div>}

      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/50 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-all duration-300 hover:border-zinc-300/80 hover:bg-white hover:shadow-xs">
        <span className="text-zinc-500">{section}</span>
        <ChevronRight className="size-3 text-zinc-300" />
        <Link
          to={dashboardUrl}
          className="text-zinc-400 transition-colors hover:text-blue-600"
          viewTransition
        >
          Dashboard
        </Link>
        <ChevronRight className="size-3 text-zinc-300" />
        <Link
          to={breadcrumbParent.to}
          search={breadcrumbParent.search || { limit: 10, page: 1 }}
          className="text-zinc-400 transition-colors hover:text-blue-600"
          onMouseEnter={breadcrumbParent.onMouseEnter}
          viewTransition
        >
          {breadcrumbParent.label}
        </Link>
        <ChevronRight className="size-3 text-zinc-300" />
        <span className="font-semibold text-zinc-800">{pageTitle}</span>
      </div>

      {children}
    </div>
  );
}
