import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { ARInvoiceCreate } from "@/features/create-pages/ar-invoice-create/components/ar-invoice-create";
import { requireActiveSession } from "@/routes/_require-active-session";

/** SalesARInvoiceCreateRoute: Page for creating new AR Invoices. */
export const Route = createFileRoute("/_layout/sales/create-ar-invoice")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: ARInvoiceCreate,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
  validateSearch: z.object({
    sourceDocNum: z.string().optional(),
    sourceDocType: z.enum(["SalesQuotation", "SalesOrder"]).optional(),
  }),
});
