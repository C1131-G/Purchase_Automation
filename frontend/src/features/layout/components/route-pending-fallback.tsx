import type { ReactNode } from "react";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { CreateOutgoingPaymentSkeleton } from "@/components/skeleton/create-outgoing-payment-skeleton";
import { OutgoingPaymentEditSkeleton } from "@/components/skeleton/outgoing-payment-edit-skeleton";
import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { OverviewDashboardSkeleton } from "@/features/dashboard/components/overview/OverviewSectionSkeletons";

/**
 * Route-aware skeleton while the next screen loads.
 * Prefer this over a blank white shell so navigation always feels continuous.
 */
export function routePendingFallbackForPath(pathname: string): ReactNode {
  const path = pathname.toLowerCase();

  if (path.startsWith("/dashboard") || path === "/" || path === "") {
    return <OverviewDashboardSkeleton />;
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
    <div className="h-full w-full overflow-hidden bg-surface" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      {routePendingFallbackForPath(path)}
    </div>
  );
}
