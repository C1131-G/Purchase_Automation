import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { GRPOTable } from "@/features/table-pages/grpo/components/grpo-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { grpoSearchSchema } from "@/features/table-pages/grpo/schemas/grpo-search.schema";

/**
 * PurchaseGRPORoute: Goods Receipt PO listing and management.
 * Synchronizes grid state with URL parameters for shareable views.
 */
export const Route = createFileRoute("/_layout/purchase/grpo")({
  component: RouteComponent,
  validateSearch: (search) => grpoSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("GRPO | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <GRPOTable />
    </div>
  );
}
