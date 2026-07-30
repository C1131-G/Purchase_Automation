import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { ensureCreateMasterData } from "@/features/create-pages/create-shared/utils/ensure-create-master-data";
import { PurchaseOrderCreate } from "@/features/create-pages/purchase-order-create/components/purchase-order-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

const createOrderSearchSchema = z.object({
  sourceDocNum: z.string().or(z.number()).transform(String).optional(),
  sourceDocType: z.enum(["PurchaseQuotation"]).optional(),
  draftDocNum: z.string().optional(),
  draftDocEntry: z.string().optional(),
});

/**
 * PurchaseOrderCreateRoute: Transactional page for drafting new procurement orders.
 * SECURITY: Requires an active backend session before rendering the form.
 * PERF: Loader warms vendors/warehouses/sales employees so the form hits cache.
 */
export const Route = createFileRoute("/_layout/purchase/create-order")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  loader: ({ context }) => ensureCreateMasterData(context.queryClient, "vendors"),
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: createOrderSearchSchema,
});

function RouteComponent() {
  useDocumentTitle("Create Purchase Order | ERP Portal");
  const { sourceDocNum, sourceDocType, draftDocNum, draftDocEntry } = Route.useSearch();
  return (
    <PurchaseOrderCreate
      sourceDocNum={sourceDocNum}
      sourceDocType={sourceDocType}
      draftDocNum={draftDocNum}
      draftDocEntry={draftDocEntry}
    />
  );
}
