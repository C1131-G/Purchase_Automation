import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { itemMasterSearchSchema } from "@/features/table-pages/item-master/schemas/item-master-search.schema";

const ItemMasterTable = lazy(() =>
  import("@/features/table-pages/item-master/components/item-master-table").then((module) => ({
    default: module.ItemMasterTable,
  })),
);

export const Route = createFileRoute("/_layout/inventory/item-master")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => itemMasterSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Item Master | ERP Portal");
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isSubRoute =
    pathname === "/inventory/item-master/create" ||
    (pathname.startsWith("/inventory/item-master/") && pathname.endsWith("/edit"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <ItemMasterTable />
      </Suspense>
    </div>
  );
}
