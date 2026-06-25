import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { ARInvoiceTable } from "@/features/table-pages/ar-invoices/components/ar-invoice-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { arInvoiceSearchSchema } from "@/features/table-pages/ar-invoices/schemas/ar-invoice-search.schema";

/**
 * ARInvoiceRoute: Accounts Receivable Invoice listing.
 * Orchestrates grid state synchronization between UI elements and URL.
 */
export const Route = createFileRoute("/_layout/sales/ar-invoice")({
  component: RouteComponent,
  validateSearch: (search) => arInvoiceSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("AR Invoices | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <ARInvoiceTable />
    </div>
  );
}
