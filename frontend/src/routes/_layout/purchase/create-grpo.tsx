import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import GRPOCreate from "@/features/create-pages/grpo-create/components/grpo-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

const createGRPOSearchSchema = z.object({
  sourceDocNum: z.string().or(z.number()).transform(String).optional(),
  sourceDocType: z.enum(["PurchaseOrder", "PurchaseQuotation"]).optional(),
  draftDocNum: z.string().optional(),
  draftDocEntry: z.string().optional(),
});

/** PurchaseGRPOCreateRoute: Page for creating new Goods Receipt POs. */
export const Route = createFileRoute("/_layout/purchase/create-grpo")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: createGRPOSearchSchema,
});

function RouteComponent() {
  useDocumentTitle("Create GRPO | ERP Portal");
  const { sourceDocNum, sourceDocType, draftDocNum, draftDocEntry } = Route.useSearch();
  return (
    <GRPOCreate
      sourceDocNum={sourceDocNum}
      sourceDocType={sourceDocType}
      draftDocNum={draftDocNum}
      draftDocEntry={draftDocEntry}
    />
  );
}
