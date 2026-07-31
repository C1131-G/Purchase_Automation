import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { createFileRoute } from "@tanstack/react-router";

import { IcRetryTable } from "@/features/intercompany/components/retries/ic-retry-table";
import { icRetrySearchSchema } from "@/features/intercompany/schemas/ic-retry-search.schema";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_layout/intercompany/retries")({
  pendingComponent: TableSkeleton,
  component: IntercompanyRetriesRoute,
  validateSearch: (search) => icRetrySearchSchema.parse(search),
});

function IntercompanyRetriesRoute() {
  useDocumentTitle("Retries Data Table | ERP Portal");
  return (
    <div className="h-full w-full">
      <IcRetryTable />
    </div>
  );
}
