import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { TransferRequestTable } from "@/features/table-pages/transfer-request/components/transfer-request-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { transferRequestSearchSchema } from "@/features/table-pages/transfer-request/schemas/transfer-request-search.schema";

export const Route = createFileRoute("/_layout/inventory/transfer-request")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => transferRequestSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Inventory Transfer Request | ERP Portal");
  const matches = useMatches();
  const isSubRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <TransferRequestTable />
    </div>
  );
}
