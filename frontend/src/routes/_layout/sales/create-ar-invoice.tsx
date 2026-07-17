import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { ARInvoiceCreate } from "@/features/create-pages/ar-invoice-create/components/ar-invoice-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

/** SalesARInvoiceCreateRoute: Page for creating new AR Invoices. */
export const Route = createFileRoute("/_layout/sales/create-ar-invoice")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: z.object({
    sourceDocNum: z.string().optional(),
    sourceDocType: z.enum(["SalesQuotation", "SalesOrder"]).optional(),
    draftDocNum: z.string().or(z.number()).transform(String).optional(),
    draftDocEntry: z.string().or(z.number()).transform(String).optional(),
  }),
});

function RouteComponent() {
  useDocumentTitle("Create AR Invoice | ERP Portal");
  const { draftDocNum, draftDocEntry } = Route.useSearch();
  return <ARInvoiceCreate draftDocNum={draftDocNum} draftDocEntry={draftDocEntry} />;
}
