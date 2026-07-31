import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { createFileRoute } from "@tanstack/react-router";

import { IcNotificationTable } from "@/features/intercompany/components/notifications/ic-notification-table";
import { icNotificationSearchSchema } from "@/features/intercompany/schemas/ic-notification-search.schema";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_layout/intercompany/notifications")({
  pendingComponent: TableSkeleton,
  component: IntercompanyNotificationsRoute,
  validateSearch: (search) => icNotificationSearchSchema.parse(search),
});

function IntercompanyNotificationsRoute() {
  useDocumentTitle("Notifications Data Table | ERP Portal");
  return (
    <div className="h-full w-full">
      <IcNotificationTable />
    </div>
  );
}
