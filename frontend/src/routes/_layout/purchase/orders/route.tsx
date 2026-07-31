import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { lazy, Suspense } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { purchaseOrderSearchSchema } from "@/features/table-pages/purchase-orders/schemas/purchase-order-search.schema";

/**
 * PurchaseOrdersRoute: Main listing for procurement documents.
 * Validates grid state (pagination, sorting, filters) via URL search schema.
 */
const PurchaseOrderTable = lazy(() =>
  import("@/features/table-pages/purchase-orders/components/purchase-order-table").then((m) => ({
    default: m.PurchaseOrderTable,
  })),
);

export const Route = createFileRoute("/_layout/purchase/orders")({
  pendingComponent: TableSkeleton,
  component: RouteComponent,
  validateSearch: (search) => purchaseOrderSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Purchase Orders | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <PurchaseOrderTable />
      </Suspense>
    </div>
  );
}
