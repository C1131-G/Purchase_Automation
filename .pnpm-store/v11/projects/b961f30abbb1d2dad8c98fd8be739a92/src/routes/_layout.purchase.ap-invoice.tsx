import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { apInvoiceSearchSchema } from "@/features/table-pages/ap-invoices/schemas/ap-invoice-search.schema";

const APInvoiceTable = lazy(() =>
  import("@/features/table-pages/ap-invoices/components/ap-invoice-table").then((module) => ({
    default: module.APInvoiceTable,
  })),
);

/**
 * APInvoiceRoute: Accounts Payable Invoice grid.
 * Enforces strict search parameter validation for consistent UI state.
 */
export const Route = createFileRoute("/_layout/purchase/ap-invoice")({
  component: RouteComponent,
  validateSearch: (search) => apInvoiceSearchSchema.parse(search),
});

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isEditRoute = pathname.startsWith("/purchase/ap-invoice/") && pathname.endsWith("/edit");

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <APInvoiceTable />
      </Suspense>
    </div>
  );
}
