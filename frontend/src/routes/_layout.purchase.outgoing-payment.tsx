import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { outgoingPaymentSearchSchema } from "@/features/table-pages/outgoing-payment/schemas/outgoing-payment-search.schema";

const OutgoingPaymentTable = lazy(() =>
  import("@/features/table-pages/outgoing-payment/components/outgoing-payment-table").then(
    (module) => ({
      default: module.OutgoingPaymentTable,
    }),
  ),
);

/**
 * OutgoingPaymentRoute: Supplier payment document listing.
 * Validates complex filter states via shared search schema patterns.
 */
export const Route = createFileRoute("/_layout/purchase/outgoing-payment")({
  component: RouteComponent,
  validateSearch: (search) => outgoingPaymentSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Outgoing Payments | ERP Portal");
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isEditRoute =
    pathname.startsWith("/purchase/outgoing-payment/") && pathname.endsWith("/edit");

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <OutgoingPaymentTable />
      </Suspense>
    </div>
  );
}
