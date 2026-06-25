import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { IncomingPaymentTable } from "@/features/table-pages/incoming-payment/components/incoming-payment-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { incomingPaymentSearchSchema } from "@/features/table-pages/incoming-payment/schemas/incoming-payment-search.schema";

/**
 * IncomingPaymentRoute: Customer payment document listing.
 * Enforces strict URL parameter validation for consistent grid state.
 */
export const Route = createFileRoute("/_layout/sales/incoming-payment")({
  component: RouteComponent,
  validateSearch: (search) => incomingPaymentSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Incoming Payments | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <IncomingPaymentTable />
    </div>
  );
}
