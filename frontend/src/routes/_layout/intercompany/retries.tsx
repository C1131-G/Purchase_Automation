import { createFileRoute } from "@tanstack/react-router";

import { IcRetryTable } from "@/features/intercompany/components/retries/ic-retry-table";
import { icRetrySearchSchema } from "@/features/intercompany/schemas/ic-retry-search.schema";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_layout/intercompany/retries")({
  component: IntercompanyRetriesRoute,
  validateSearch: (search) => icRetrySearchSchema.parse(search),
});

function IntercompanyRetriesRoute() {
  useDocumentTitle("IC Retries | ERP Portal");
  return (
    <div className="h-full w-full">
      <IcRetryTable />
    </div>
  );
}
