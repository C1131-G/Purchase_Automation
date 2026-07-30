import { createFileRoute } from "@tanstack/react-router";

import { z } from "zod";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import {
  createPageHighlightSearchSchema,
  toCreatePageHighlightProps,
} from "@/features/create-pages/create-shared/utils/create-page-highlight";
import { ensureCreateMasterData } from "@/features/create-pages/create-shared/utils/ensure-create-master-data";
import { SalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/components/sales-quotation-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

/**
 * SalesQuotationCreateRoute: Transactional page for drafting new sales orders.
 * SECURITY: Requires an active backend session before rendering the form.
 * PERF: Loader warms customers/warehouses/sales employees so the form hits cache.
 */
export const Route = createFileRoute("/_layout/sales/create-quotation")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  loader: ({ context }) => ensureCreateMasterData(context.queryClient, "customers"),
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: (search) =>
    z
      .object({
        draftDocNum: z.string().or(z.number()).transform(String).optional(),
        draftDocEntry: z.string().or(z.number()).transform(String).optional(),
      })
      .merge(createPageHighlightSearchSchema)
      .parse(search),
});

function RouteComponent() {
  useDocumentTitle("Create Sales Quotation | ERP Portal");
  const { draftDocNum, draftDocEntry, highlightDocNum, highlightUntil } = Route.useSearch();
  return (
    <SalesQuotationCreate
      {...(draftDocEntry !== undefined ? { draftDocEntry } : {})}
      {...(draftDocNum !== undefined ? { draftDocNum } : {})}
      {...toCreatePageHighlightProps(highlightDocNum, highlightUntil)}
    />
  );
}
