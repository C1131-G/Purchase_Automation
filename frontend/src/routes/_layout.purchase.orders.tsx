import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { PurchaseOrderTable } from "@/features/table-pages/purchase-orders/components/purchase-order-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { purchaseOrderSearchSchema } from "@/features/table-pages/purchase-orders/schemas/purchase-order-search.schema";

/**
 * PurchaseOrdersRoute: Main listing for procurement documents.
 * Validates grid state (pagination, sorting, filters) via URL search schema.
 */
export const Route = createFileRoute("/_layout/purchase/orders")({
  component: RouteComponent,
  validateSearch: (search) => purchaseOrderSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Purchase Orders | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <PurchaseOrderTable />
    </div>
  );
}
