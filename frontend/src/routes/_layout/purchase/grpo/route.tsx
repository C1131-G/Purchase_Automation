import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { lazy, Suspense } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { grpoSearchSchema } from "@/features/table-pages/grpo/schemas/grpo-search.schema";

/**
 * PurchaseGRPORoute: Goods Receipt PO listing and management.
 * Synchronizes grid state with URL parameters for shareable views.
 */
const GRPOTable = lazy(() =>
  import("@/features/table-pages/grpo/components/grpo-table").then((m) => ({
    default: m.GRPOTable,
  })),
);

export const Route = createFileRoute("/_layout/purchase/grpo")({
  pendingComponent: TableSkeleton,
  component: RouteComponent,
  validateSearch: (search) => grpoSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("GRPO | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <GRPOTable />
      </Suspense>
    </div>
  );
}
