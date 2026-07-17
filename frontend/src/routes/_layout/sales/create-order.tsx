import { createFileRoute } from "@tanstack/react-router";

import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { SalesOrderCreate } from "@/features/create-pages/sales-order-create/components/sales-order-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

/**
 * SalesOrderCreateRoute: Transactional page for drafting new sales orders.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/sales/create-order")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: (search) =>
    z
      .object({
        draftDocNum: z.string().or(z.number()).transform(String).optional(),
        draftDocEntry: z.string().or(z.number()).transform(String).optional(),
      })
      .parse(search),
});

function RouteComponent() {
  useDocumentTitle("Create Sales Order | ERP Portal");
  const { draftDocNum, draftDocEntry } = Route.useSearch();
  return <SalesOrderCreate draftDocNum={draftDocNum} draftDocEntry={draftDocEntry} />;
}
