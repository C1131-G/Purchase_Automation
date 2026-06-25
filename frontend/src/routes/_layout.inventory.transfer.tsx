import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { TransferTable } from "@/features/table-pages/transfer/components/transfer-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { transferSearchSchema } from "@/features/table-pages/transfer/schemas/transfer-search.schema";

export const Route = createFileRoute("/_layout/inventory/transfer")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => transferSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Inventory Transfer | ERP Portal");
  const matches = useMatches();
  const isSubRoute = matches.some((m) => m.id.endsWith("/edit") || m.id.endsWith("/create"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <TransferTable />
    </div>
  );
}
