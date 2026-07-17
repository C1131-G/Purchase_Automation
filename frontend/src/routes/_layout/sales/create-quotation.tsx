import { createFileRoute } from "@tanstack/react-router";

import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { SalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/components/sales-quotation-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

/**
 * SalesQuotationCreateRoute: Transactional page for drafting new sales orders.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/sales/create-quotation")({
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
  useDocumentTitle("Create Sales Quotation | ERP Portal");
  const { draftDocNum, draftDocEntry } = Route.useSearch();
  return <SalesQuotationCreate draftDocNum={draftDocNum} draftDocEntry={draftDocEntry} />;
}
