import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { APCreditMemoTable } from "@/features/table-pages/ap-credit-memo/components/ap-credit-memo-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { apCreditMemoSearchSchema } from "@/features/table-pages/ap-credit-memo/schemas/ap-credit-memo-search.schema";

/**
 * APCreditMemoRoute: Procurement return documents listing.
 * Orchestrates grid state persistence via URL serialization.
 * Yields to child edit route when navigating to an individual document.
 */
export const Route = createFileRoute("/_layout/purchase/ap-credit-memo")({
  component: RouteComponent,
  validateSearch: (search) => apCreditMemoSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("AP Credit Memos | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <APCreditMemoTable />
    </div>
  );
}
