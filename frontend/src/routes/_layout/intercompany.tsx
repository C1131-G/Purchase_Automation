import { createFileRoute } from "@tanstack/react-router";

import { IcComingSoonPage } from "@/features/intercompany/components/ic-coming-soon-page";
import { useDocumentTitle } from "@/hooks/use-document-title";

/**
 * Hidden IC shell route (no sidebar entry in P4).
 * Direct URL: `/intercompany`
 */
export const Route = createFileRoute("/_layout/intercompany")({
  component: IntercompanyShellRoute,
});

function IntercompanyShellRoute() {
  useDocumentTitle("Intercompany | ERP Portal");
  return <IcComingSoonPage />;
}
