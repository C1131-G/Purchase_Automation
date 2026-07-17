import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { SalesOrderTable } from "@/features/table-pages/sales-orders/components/sales-order-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { salesOrderSearchSchema } from "@/features/table-pages/sales-orders/schemas/sales-order-search.schema";

/**
 * SalesOrdersRoute: Main listing for sales document management.
 * Enforces grid-state validation via shared search schema patterns.
 */
export const Route = createFileRoute("/_layout/sales/orders")({
  component: RouteComponent,
  validateSearch: (search) => salesOrderSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Sales Orders | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <SalesOrderTable />
    </div>
  );
}
