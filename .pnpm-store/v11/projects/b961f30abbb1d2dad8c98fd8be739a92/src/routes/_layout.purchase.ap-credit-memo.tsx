import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { apCreditMemoSearchSchema } from "@/features/table-pages/ap-credit-memo/schemas/ap-credit-memo-search.schema";

const APCreditMemoTable = lazy(() =>
  import("@/features/table-pages/ap-credit-memo/components/ap-credit-memo-table").then(
    (module) => ({
      default: module.APCreditMemoTable,
    }),
  ),
);

/**
 * APCreditMemoRoute: Procurement return documents listing.
 * Orchestrates grid state persistence via URL serialization.
 * Yields to child edit route when navigating to an individual document.
 */
export const Route = createFileRoute("/_layout/purchase/ap-credit-memo")({
  component: RouteComponent,
  validateSearch: (search) => apCreditMemoSearchSchema.parse(search),
});

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isEditRoute =
    pathname.startsWith("/purchase/ap-credit-memo/") && pathname.endsWith("/edit");

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <APCreditMemoTable />
      </Suspense>
    </div>
  );
}
