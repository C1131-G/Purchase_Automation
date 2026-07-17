import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { ArCreditMemoTable } from "@/features/table-pages/ar-credit-memo/components/ar-credit-memo-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { ArCreditMemoSearchSchema } from "@/features/table-pages/ar-credit-memo/schemas/ar-credit-memo-search.schema";

/**
 * ArCreditMemoRoute: Sales return document management.
 * Validates grid state via URL search schema for consistent views.
 */
export const Route = createFileRoute("/_layout/sales/ar-credit-memo")({
  component: RouteComponent,
  validateSearch: (search) => ArCreditMemoSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("AR Credit Memos | ERP Portal");
  const matches = useMatches();
  const isSubRoute = matches.some(
    (m) => m.id.endsWith("/update") || m.id.endsWith("/create") || m.id.endsWith("/select-invoice"),
  );

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <ArCreditMemoTable />
    </div>
  );
}
