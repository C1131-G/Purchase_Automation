import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { incomingPaymentSearchSchema } from "@/features/table-pages/incoming-payment/schemas/incoming-payment-search.schema";

const IncomingPaymentTable = lazy(() =>
  import("@/features/table-pages/incoming-payment/components/incoming-payment-table").then(
    (module) => ({
      default: module.IncomingPaymentTable,
    }),
  ),
);

/**
 * IncomingPaymentRoute: Customer payment document listing.
 * Enforces strict URL parameter validation for consistent grid state.
 */
export const Route = createFileRoute("/_layout/sales/incoming-payment")({
  component: RouteComponent,
  validateSearch: (search) => incomingPaymentSearchSchema.parse(search),
});

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isEditRoute = pathname.startsWith("/sales/incoming-payment/") && pathname.endsWith("/edit");

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <IncomingPaymentTable />
      </Suspense>
    </div>
  );
}
