import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { lazy, Suspense } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { icRfqQueries } from "@/features/intercompany/api/intercompany.queries";
import { rfqSearchSchema } from "@/features/table-pages/rfqs/schemas/rfq-search.schema";
import { useDocumentTitle } from "@/hooks/use-document-title";

const RfqTable = lazy(() =>
  import("@/features/table-pages/rfqs/components/rfq-table").then((m) => ({ default: m.RfqTable })),
);

export const Route = createFileRoute("/_layout/sales/request-for-quotations")({
  pendingComponent: TableSkeleton,
  component: RouteComponent,
  validateSearch: (search) => rfqSearchSchema.parse(search),
  /** Start RFQ list fetch as soon as the route matches (parallel with lazy chunk). */
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(icRfqQueries.list());
  },
});

function RouteComponent() {
  useDocumentTitle("Request For Quotations | ERP Portal");
  const matches = useMatches();
  const isDetailRoute = matches.some(
    (m) => m.id.endsWith("/$rfqId") || m.id.includes("/sales/request-for-quotations/$rfqId"),
  );

  if (isDetailRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <RfqTable />
      </Suspense>
    </div>
  );
}
