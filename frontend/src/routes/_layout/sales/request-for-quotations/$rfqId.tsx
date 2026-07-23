import { createFileRoute, Link } from "@tanstack/react-router";

import { useIcRfq } from "@/features/intercompany/api/intercompany.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

/**
 * Phase 1 stub — Phase 2 replaces this with a Purchase Quotation create-mirrored
 * Request For Quotation fill form. Keeps double-click navigation from the table stable.
 */
export const Route = createFileRoute("/_layout/sales/request-for-quotations/$rfqId")({
  component: RequestForQuotationDetailStubRoute,
});

function RequestForQuotationDetailStubRoute() {
  const { rfqId: rfqIdParam } = Route.useParams();
  const rfqId = Number(rfqIdParam);
  const detailQuery = useIcRfq(rfqId, Number.isFinite(rfqId) && rfqId > 0);
  const header = detailQuery.data?.data;
  const titleNumber = header?.rfqNumber ?? rfqIdParam;

  useDocumentTitle(`Request For Quotation ${titleNumber} | ERP Portal`);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          to="/sales/request-for-quotations"
          search={{ limit: 10, page: 1 }}
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Request For Quotations
        </Link>
        <span aria-hidden>/</span>
        <span className="text-zinc-800">{titleNumber}</span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
          Request For Quotation {titleNumber}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Detail and fill form ship in Phase 2 (layout mirrored from Purchase Quotation create).
          Table open/navigation is ready.
        </p>

        {detailQuery.isLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading Request For Quotation…</p>
        ) : null}

        {detailQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">
            {toSafeErrorMessage(
              detailQuery.error instanceof Error ? detailQuery.error.message : undefined,
              "Could not load Request For Quotation.",
            )}
          </p>
        ) : null}

        {header ? (
          <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-900">{header.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Vendor
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-900">{header.vendorCode}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Purchase Quotation Draft No.
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-900">{header.pqDraftDocNum ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Purchase Quotation Draft Entry
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-900">{header.pqDraftDocEntry}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lines</dt>
              <dd className="mt-0.5 font-medium text-zinc-900">{header.lines?.length ?? 0}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}
