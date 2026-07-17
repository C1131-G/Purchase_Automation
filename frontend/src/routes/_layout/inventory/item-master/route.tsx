import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { ItemMasterTable } from "@/features/table-pages/item-master/components/item-master-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";
import { itemMasterSearchSchema } from "@/features/table-pages/item-master/schemas/item-master-search.schema";

export const Route = createFileRoute("/_layout/inventory/item-master")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => itemMasterSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Item Master | ERP Portal");
  const matches = useMatches();
  const isSubRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <ItemMasterTable />
    </div>
  );
}
