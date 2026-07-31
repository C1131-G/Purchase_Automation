import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { lazy, Suspense } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { outgoingPaymentSearchSchema } from "@/features/table-pages/outgoing-payment/schemas/outgoing-payment-search.schema";

/**
 * OutgoingPaymentRoute: Supplier payment document listing.
 * Validates complex filter states via shared search schema patterns.
 */
const OutgoingPaymentTable = lazy(() =>
  import("@/features/table-pages/outgoing-payment/components/outgoing-payment-table").then((m) => ({
    default: m.OutgoingPaymentTable,
  })),
);

export const Route = createFileRoute("/_layout/purchase/outgoing-payment")({
  pendingComponent: TableSkeleton,
  component: RouteComponent,
  validateSearch: (search) => outgoingPaymentSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Outgoing Payments | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

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
