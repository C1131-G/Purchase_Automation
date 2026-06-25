import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { PurchaseQuotationTable } from "@/features/table-pages/purchase-quotations/components/purchase-quotation-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { purchaseQuotationSearchSchema } from "@/features/table-pages/purchase-quotations/schemas/purchase-quotation-search.schema";

export const Route = createFileRoute("/_layout/purchase/quotations")({
  component: RouteComponent,
  validateSearch: (search) => purchaseQuotationSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Purchase Quotations | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <PurchaseQuotationTable />
    </div>
  );
}
