import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface BreadcrumbItem {
  label: string;
  to: string;
  search?: Record<string, unknown> | object;
  onMouseEnter?: () => void;
}

interface CreatePageWrapperProps {
  /** @deprecated section is derived from dashboardUrl automatically */
  dashboardName?: string;
  dashboardUrl: string; // e.g., "/dashboard"
  breadcrumbParent: BreadcrumbItem;
  pageTitle: string;
  /** When set, highlights the matching doc ref inside `pageTitle`. */
  highlightDocRef?: string | null;
  editError?: string | null;
  topActions?: ReactNode;
  children: ReactNode;
  /** Fill the shell height (batch/serial setup) instead of leaving footer padding. */
  fillHeight?: boolean;
}

const renderHighlightedTitle = (pageTitle: string, highlightDocRef?: string | null): ReactNode => {
  const ref = highlightDocRef?.trim();
  if (!ref) {
    return pageTitle;
  }

  const index = pageTitle.indexOf(ref);
  if (index === -1) {
    return (
      <>
        {pageTitle}{" "}
        <span className="rounded-md bg-violet-100 px-1.5 py-0.5 font-bold text-violet-800">
          #{ref}
        </span>
      </>
    );
  }

  return (
    <>
      {pageTitle.slice(0, index)}
      <span className="rounded-md bg-violet-100 px-1.5 py-0.5 font-bold text-violet-800">
        {ref}
      </span>
      {pageTitle.slice(index + ref.length)}
    </>
  );
};

/**
 * CreatePageWrapper: Unified layout wrapper for all entity creation/edit pages.
 * Handles consistent spacing, breadcrumbs, and error boundaries for edit hydration.
 */
export function CreatePageWrapper({
  dashboardUrl,
  breadcrumbParent,
  pageTitle,
  highlightDocRef,
  editError,
  topActions,
  children,
  fillHeight = false,
}: CreatePageWrapperProps) {
  if (editError) {
    return (
      <div className="w-full bg-linen-50 p-3 pb-20">
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
    <div
      className={
        fillHeight
          ? "relative flex h-full w-full flex-col overflow-hidden bg-linen-50 p-3"
          : "relative h-full w-full overflow-y-auto bg-linen-50 p-3 pb-20"
      }
    >
      {/* Top Actions - Positioned absolute top-right */}
      {topActions && <div className="absolute right-3 top-3 z-10">{topActions}</div>}

      <div className="mb-3 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-linen-200/60 bg-linen-50/50 px-3.5 py-1.5 text-xs font-medium text-neutral-500 transition-all duration-300 hover:border-linen-200/80 hover:bg-surface hover:shadow-xs">
        <span className="text-neutral-500">{section}</span>
        <ChevronRight className="size-3 text-neutral-300" />
        <Link to={dashboardUrl} className="text-neutral-400 transition-colors hover:text-teal-600">
          Dashboard
        </Link>
        <ChevronRight className="size-3 text-neutral-300" />
        <Link
          to={breadcrumbParent.to}
          search={breadcrumbParent.search || { limit: 10, page: 1 }}
          className="text-neutral-400 transition-colors hover:text-teal-600"
          onMouseEnter={breadcrumbParent.onMouseEnter}
        >
          {breadcrumbParent.label}
        </Link>
        <ChevronRight className="size-3 text-neutral-300" />
        <span className="font-semibold text-ink-900">
          {renderHighlightedTitle(pageTitle, highlightDocRef)}
        </span>
      </div>

      {fillHeight ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
    </div>
  );
}
