import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { useSetSidebarAction } from "@/store/sidebar/sidebar.store";

interface BreadcrumbItem {
  label: string;
  to: string;
  search?: Record<string, unknown>;
  onMouseEnter?: () => void;
}

interface CreatePageWrapperProps {
  rootLabel: string; // e.g., "Purchase" or "Sales"
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
  rootLabel,
  breadcrumbParent,
  pageTitle,
  editError,
  topActions,
  children,
}: CreatePageWrapperProps) {
  const setSidebarOpen = useSetSidebarAction();

  if (editError) {
    return (
      <div className="w-full bg-zinc-50 p-3 pb-20">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {editError}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-zinc-50 p-3 pb-20">
      {/* Top Actions - Positioned absolute top-right */}
      {topActions && <div className="absolute right-3 top-3 z-10">{topActions}</div>}

      <div className="mb-3 inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <button
          type="button"
          className="cursor-pointer text-blue-600 hover:text-blue-700"
          onClick={() => setSidebarOpen(true)}
        >
          {rootLabel}
        </button>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <Link
          to={breadcrumbParent.to}
          search={breadcrumbParent.search || { limit: 10, page: 1 }}
          className="cursor-pointer text-blue-600 hover:text-blue-700"
          onMouseEnter={breadcrumbParent.onMouseEnter}
          viewTransition
        >
          {breadcrumbParent.label}
        </Link>
        <ChevronRight className="size-3.5 text-zinc-300" />
        <span className="text-zinc-700">{pageTitle}</span>
      </div>

      {children}
    </div>
  );
}
