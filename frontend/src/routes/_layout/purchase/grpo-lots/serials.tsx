import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { LotSetupPage } from "@/features/create-pages/create-shared/lot-setup/lot-setup-page";
import { hasLotKindRows } from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useGRPOLines } from "@/store/create/grpo-create.store";
import { useGRPOLotSessionStore } from "@/store/create/grpo-lot-session.store";

const searchSchema = z.object({
  selectedRowId: z.string().optional(),
});

export const Route = createFileRoute("/_layout/purchase/grpo-lots/serials")({
  component: SerialsSetupRoute,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: searchSchema,
});

function SerialsSetupRoute() {
  useDocumentTitle("Serial Numbers - Setup | ERP Portal");
  const { selectedRowId } = Route.useSearch();
  const lines = useGRPOLines();
  const returnTo = useGRPOLotSessionStore((state) => state.returnTo);

  if (!hasLotKindRows(lines, "serials")) {
    return (
      <Navigate
        replace
        search={returnTo?.search ?? {}}
        to={returnTo?.to ?? "/purchase/create-grpo"}
      />
    );
  }

  return <LotSetupPage kind="serials" {...(selectedRowId ? { selectedRowId } : {})} />;
}
