import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { lazy, Suspense } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { apInvoiceSearchSchema } from "@/features/table-pages/ap-invoices/schemas/ap-invoice-search.schema";

/**
 * APInvoiceRoute: Accounts Payable Invoice grid.
 * Enforces strict search parameter validation for consistent UI state.
 */
const APInvoiceTable = lazy(() =>
  import("@/features/table-pages/ap-invoices/components/ap-invoice-table").then((m) => ({
    default: m.APInvoiceTable,
  })),
);

export const Route = createFileRoute("/_layout/purchase/ap-invoice")({
  pendingComponent: TableSkeleton,
  component: RouteComponent,
  validateSearch: (search) => apInvoiceSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("AP Invoices | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

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
