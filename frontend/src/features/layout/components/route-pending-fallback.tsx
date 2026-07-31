import type { ReactNode } from "react";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { CreateOutgoingPaymentSkeleton } from "@/components/skeleton/create-outgoing-payment-skeleton";
import { OutgoingPaymentEditSkeleton } from "@/components/skeleton/outgoing-payment-edit-skeleton";
import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { OverviewDashboardContentSkeleton } from "@/features/dashboard/components/overview/OverviewSectionSkeletons";

/**
 * Route-aware skeleton while the next screen loads.
 * Prefer this over a blank white shell so navigation always feels continuous.
 */
export function routePendingFallbackForPath(pathname: string): ReactNode {
  const path = pathname.toLowerCase();

  if (path.startsWith("/dashboard") || path === "/" || path === "") {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        <div className="shrink-0 border-b border-sky-100/80 bg-gradient-to-r from-sky-50/90 via-white to-violet-50/50 px-6 py-5 sm:px-8">
          <div className="mx-auto max-w-7xl space-y-2">
            <div className="h-7 w-40 animate-pulse rounded-md bg-zinc-100" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-zinc-100/80" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/40 via-white to-violet-50/30 px-6 py-8 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <OverviewDashboardContentSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (path.includes("outgoing-payment") && (path.includes("create") || path.includes("update"))) {
    return path.includes("update") ? (
      <OutgoingPaymentEditSkeleton />
    ) : (
      <CreateOutgoingPaymentSkeleton />
    );
  }

  if (
    path.includes("/create") ||
    path.includes("/update") ||
    path.includes("/edit") ||
    path.includes("request-for-quotations/")
  ) {
    return <CreatePageRouteSkeleton />;
  }

  if (
    path.startsWith("/purchase") ||
    path.startsWith("/sales") ||
    path.startsWith("/intercompany")
  ) {
    return <TableSkeleton />;
  }

  return <TableSkeleton />;
}

export function RoutePendingFallback({ pathname }: { pathname?: string }) {
  const path =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/dashboard");

  return (
    <div className="h-full w-full overflow-hidden bg-white" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      {routePendingFallbackForPath(path)}
    </div>
  );
}
