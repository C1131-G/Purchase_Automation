import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import GRPOCreate from "@/features/create-pages/grpo-create/components/grpo-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

/** PurchaseGRPOCreateRoute: Page for creating new Goods Receipt POs. */
export const Route = createFileRoute("/_layout/purchase/create-grpo")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: z.object({
    sourceDocNum: z.string().or(z.number()).transform(String).optional(),
    sourceDocType: z.enum(["PurchaseOrder", "PurchaseQuotation"]).optional(),
  }),
});

function RouteComponent() {
  useDocumentTitle("Create GRPO | ERP Portal");
  const { sourceDocNum, sourceDocType } = Route.useSearch();
  return <GRPOCreate sourceDocNum={sourceDocNum} sourceDocType={sourceDocType} />;
}
