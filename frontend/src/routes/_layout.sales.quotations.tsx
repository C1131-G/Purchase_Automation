import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { SalesQuotationTable } from "@/features/table-pages/sales-quotations/components/sales-quotation-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { salesQuotationSearchSchema } from "@/features/table-pages/sales-quotations/schemas/sales-quotation-search.schema";

export const Route = createFileRoute("/_layout/sales/quotations")({
  component: RouteComponent,
  validateSearch: (search) => salesQuotationSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Sales Quotations | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <SalesQuotationTable />
    </div>
  );
}
