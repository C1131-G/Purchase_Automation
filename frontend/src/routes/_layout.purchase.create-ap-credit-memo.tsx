import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import APCreditMemoCreate from "@/features/create-pages/ap-credit-memo-create/components/ap-credit-memo-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

/** PurchaseAPCreditMemoCreateRoute: Page for creating new AP Credit Memos. */
export const Route = createFileRoute("/_layout/purchase/create-ap-credit-memo")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: (search) =>
    z
      .object({
        sourceDocNum: z.string().or(z.number()).transform(String).optional(),
        sourceDocType: z.enum(["APInvoice"]).optional(),
      })
      .parse(search),
});

function RouteComponent() {
  useDocumentTitle("Create AP Credit Memo | ERP Portal");
  const { sourceDocNum, sourceDocType } = Route.useSearch();
  return (
    <APCreditMemoCreate
      sourceDocNum={sourceDocNum}
      sourceDocType={sourceDocType as "APInvoice" | undefined}
    />
  );
}
