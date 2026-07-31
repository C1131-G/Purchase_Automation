import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import {
  createPageHighlightSearchSchema,
  toCreatePageHighlightProps,
} from "@/features/create-pages/create-shared/utils/create-page-highlight";
import { RequestForQuotationForm } from "@/features/create-pages/request-for-quotation/components/request-for-quotation-form";
import { icRfqQueries, useIcRfq } from "@/features/intercompany/api/intercompany.queries";
import { formatRfqDocNumber } from "@/features/table-pages/rfqs/utils/format-rfq-doc-number";
import { useDocumentTitle } from "@/hooks/use-document-title";

/**
 * Phase 2 — Request For Quotation fill form (PQ create layout).
 * Opened by double-click Doc Number on the RFQ table.
 */
export const Route = createFileRoute("/_layout/sales/request-for-quotations/$rfqId")({
  component: RequestForQuotationDetailRoute,
  /** Same pattern as other document edit routes — detail warm before paint. */
  loader: ({ context, params }) => {
    const rfqId = Number(params.rfqId);
    if (!Number.isFinite(rfqId) || rfqId <= 0) {
      return;
    }
    return context.queryClient.ensureQueryData(icRfqQueries.detail(rfqId));
  },
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: createPageHighlightSearchSchema,
});

function RequestForQuotationDetailRoute() {
  const { rfqId: rfqIdParam } = Route.useParams();
  const { highlightDocNum, highlightUntil } = Route.useSearch();
  const rfqId = Number(rfqIdParam);
  const detailQuery = useIcRfq(rfqId, Number.isFinite(rfqId) && rfqId > 0);
  const titleNumber = detailQuery.data?.data?.rfqNumber
    ? formatRfqDocNumber(detailQuery.data.data.rfqNumber)
    : rfqIdParam;

  useDocumentTitle(`Request For Quotation ${titleNumber} | ERP Portal`);

  if (!Number.isFinite(rfqId) || rfqId <= 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10 text-sm text-red-600">
        Invalid Request For Quotation id.
      </div>
    );
  }

  return (
    <RequestForQuotationForm
      rfqId={rfqId}
      {...toCreatePageHighlightProps(highlightDocNum, highlightUntil)}
    />
  );
}
