import type { OverviewPartnerSelection } from "../../utils/overview.types";

interface StatementShellProps {
  selection: OverviewPartnerSelection;
  partnerCount: number;
}

function selectionCaption(selection: OverviewPartnerSelection, partnerCount: number): string {
  if (selection.kind === "all") {
    if (partnerCount === 0) {
      return "No connected partners yet — balances land in P4";
    }
    return `All connected partners (${partnerCount}) · balance and aging in P4`;
  }

  const name = selection.cardName?.trim() || selection.cardCode;
  const company = selection.partnerCompanyName?.trim();
  const role = selection.role === "vendor" ? "Vendor" : "Customer";
  return company
    ? `${role} ${name} · ${company} · balance and aging in P4`
    : `${role} ${name} · balance and aging in P4`;
}

/**
 * P2 statement shell: shows filter context from partner selection.
 * Live balance + aging buckets arrive in P4.
 */
export function StatementShell({ selection, partnerCount }: StatementShellProps) {
  const caption = selectionCaption(selection, partnerCount);
  const filterLabel =
    selection.kind === "all" ? "All connected" : selection.cardName?.trim() || selection.cardCode;

  return (
    <section
      id="overview-statement"
      aria-label="Statement"
      className="flex min-h-[180px] flex-col rounded-xl border border-zinc-200 bg-white scroll-mt-4"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Statement</h2>
            <p className="mt-0.5 text-xs text-zinc-400">{caption}</p>
          </div>
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-600">
            Filter: {filterLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { key: "d0", label: "0–30" },
            { key: "d31", label: "31–60" },
            { key: "d61", label: "61–90" },
            { key: "d90", label: "90+" },
          ].map((bucket) => (
            <div
              key={bucket.key}
              className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
            >
              <p className="text-[11px] font-medium text-zinc-400">{bucket.label} days</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-300">—</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
          <span className="text-xs font-medium text-zinc-500">Balance</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-300">—</span>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Partner balances and open-invoice aging will load here.
        </p>
      </div>
    </section>
  );
}
