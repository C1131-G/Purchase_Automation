import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import APInvoiceCreate from "@/features/create-pages/ap-invoice-create/components/ap-invoice-create";
import { requireActiveSession } from "@/routes/_require-active-session";

/** PurchaseAPInvoiceCreateRoute: Page for creating new A/P Invoices. */
export const Route = createFileRoute("/_layout/purchase/create-ap-invoice")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: z.object({
    sourceDocNum: z.string().or(z.number()).transform(String).optional(),
    sourceDocType: z.enum(["PurchaseOrder", "GoodsReceiptPO"]).optional(),
  }),
});

function RouteComponent() {
  const { sourceDocNum, sourceDocType } = Route.useSearch();
  return <APInvoiceCreate sourceDocNum={sourceDocNum} sourceDocType={sourceDocType} />;
}
