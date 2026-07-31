import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { lazy, Suspense } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { purchaseQuotationSearchSchema } from "@/features/table-pages/purchase-quotations/schemas/purchase-quotation-search.schema";

const PurchaseQuotationTable = lazy(() =>
  import("@/features/table-pages/purchase-quotations/components/purchase-quotation-table").then(
    (m) => ({ default: m.PurchaseQuotationTable }),
  ),
);

export const Route = createFileRoute("/_layout/purchase/quotations")({
  pendingComponent: TableSkeleton,
  component: RouteComponent,
  validateSearch: (search) => purchaseQuotationSearchSchema.parse(search),
});

function RouteComponent() {
  useDocumentTitle("Purchase Quotations | ERP Portal");
  const matches = useMatches();
  const isEditRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <PurchaseQuotationTable />
      </Suspense>
    </div>
  );
}
