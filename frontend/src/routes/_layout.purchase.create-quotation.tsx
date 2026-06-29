import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { PurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

const createQuotationSearchSchema = z.object({
  draftDocNum: z.string().optional(),
  draftDocEntry: z.string().optional(),
});

/**
 * PurchaseQuotationCreateRoute: Transactional page for drafting new purchase quotations.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/purchase/create-quotation")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: createQuotationSearchSchema,
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  useDocumentTitle("Create Purchase Quotation | ERP Portal");
  return <PurchaseQuotationCreate />;
}
