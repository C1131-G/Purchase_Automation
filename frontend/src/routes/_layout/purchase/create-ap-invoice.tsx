import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import APInvoiceCreate from "@/features/create-pages/ap-invoice-create/components/ap-invoice-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

/** PurchaseAPInvoiceCreateRoute: Page for creating new A/P Invoices. */
export const Route = createFileRoute("/_layout/purchase/create-ap-invoice")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: z.object({
    sourceDocNum: z.string().or(z.number()).transform(String).optional(),
    sourceDocType: z.enum(["PurchaseOrder", "GoodsReceiptPO", "PurchaseQuotation"]).optional(),
    draftDocNum: z.string().or(z.number()).transform(String).optional(),
    draftDocEntry: z.string().or(z.number()).transform(String).optional(),
  }),
});

function RouteComponent() {
  useDocumentTitle("Create AP Invoice | ERP Portal");
  const { sourceDocNum, sourceDocType, draftDocNum, draftDocEntry } = Route.useSearch();
  return (
    <APInvoiceCreate
      sourceDocNum={sourceDocNum}
      sourceDocType={sourceDocType}
      draftDocNum={draftDocNum}
      draftDocEntry={draftDocEntry}
    />
  );
}
