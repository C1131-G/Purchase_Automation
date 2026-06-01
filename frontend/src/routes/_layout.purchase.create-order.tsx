import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { PurchaseOrderCreate } from "@/features/create-pages/purchase-order-create/components/purchase-order-create";
import { requireActiveSession } from "@/routes/_require-active-session";

/**
 * PurchaseOrderCreateRoute: Transactional page for drafting new procurement orders.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/purchase/create-order")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
  validateSearch: z.object({
    sourceDocNum: z.string().or(z.number()).transform(String).optional(),
    sourceDocType: z.enum(["PurchaseQuotation"]).optional(),
  }),
});

function RouteComponent() {
  const { sourceDocNum, sourceDocType } = Route.useSearch();
  return <PurchaseOrderCreate sourceDocNum={sourceDocNum} sourceDocType={sourceDocType} />;
}
