import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { RfqTable } from "@/features/table-pages/rfqs/components/rfq-table";
import { rfqSearchSchema } from "@/features/table-pages/rfqs/schemas/rfq-search.schema";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_layout/sales/request-for-quotations")({
  component: RouteComponent,
  validateSearch: (search) => rfqSearchSchema.parse(search),
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
      <RfqTable />
    </div>
  );
}
