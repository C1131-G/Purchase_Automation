import { formatCurrency } from "../../utils/formatters";
import type {
  OverviewAging,
  OverviewPartnerSelection,
  OverviewStatement,
} from "../../utils/overview.types";
import { resolveStatementView } from "../../utils/overview.types";

interface StatementShellProps {
  selection: OverviewPartnerSelection;
  partnerCount: number;
  statement: OverviewStatement;
  currency: string;
}

function selectionCaption(
  selection: OverviewPartnerSelection,
  partnerCount: number,
  hasStatementRows: boolean,
): string {
  if (selection.kind === "all") {
    if (partnerCount === 0) {
      return "No connected partners — map IC partners to see balances";
    }
    if (!hasStatementRows) {
      return `All connected partners (${partnerCount}) · balances unavailable`;
    }
    return `All connected partners (${partnerCount}) · open invoice aging`;
  }

  const name = selection.cardName?.trim() || selection.cardCode;
  const company = selection.partnerCompanyName?.trim();
  const role = selection.role === "vendor" ? "Vendor" : "Customer";
  return company ? `${role} ${name} · ${company}` : `${role} ${name}`;
}

const AGING_BUCKETS: { key: keyof OverviewAging; label: string }[] = [
  { key: "d0_30", label: "0–30" },
  { key: "d31_60", label: "31–60" },
  { key: "d61_90", label: "61–90" },
  { key: "d90_plus", label: "90+" },
];

/**
 * Statement balance + aging for IC-connected partners.
 * Client filters to one partner when selected; default is all-connected totals.
 */
export function StatementShell({
  selection,
  partnerCount,
  statement,
  currency,
}: StatementShellProps) {
  const { balance, aging, showEmptyPartner } = resolveStatementView(
    selection,
    statement,
    partnerCount,
  );

  const filterLabel =
    selection.kind === "all" ? "All connected" : selection.cardName?.trim() || selection.cardCode;

  const caption = selectionCaption(selection, partnerCount, statement.partners.length > 0);
  const openAgingTotal = aging.d0_30 + aging.d31_60 + aging.d61_90 + aging.d90_plus;

  return (
    <section
      id="overview-statement"
      aria-label="Statement"
      className="flex min-h-[180px] flex-col scroll-mt-4 rounded-xl border border-zinc-200 bg-white"
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
        {partnerCount === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            Connect intercompany partners to load balances and aging.
          </p>
        ) : showEmptyPartner ? (
          <p className="text-center text-sm text-zinc-500">
            No statement row for this partner in the current company books.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AGING_BUCKETS.map((bucket) => {
                const value = aging[bucket.key];
                const hasValue = value !== 0;
                return (
                  <div
                    key={bucket.key}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
                  >
                    <p className="text-[11px] font-medium text-zinc-400">{bucket.label} days</p>
                    <p
                      className={`mt-1 text-sm font-semibold tabular-nums ${
                        hasValue ? "text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      {formatCurrency(value, currency, true)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-zinc-500">Balance</span>
                <span className="text-[11px] text-zinc-400">OCRD account balance</span>
              </div>
              <span className="text-base font-semibold tabular-nums text-zinc-950">
                {formatCurrency(balance, currency)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Open invoice aging total</span>
              <span className="text-sm font-medium tabular-nums text-zinc-700">
                {formatCurrency(openAgingTotal, currency)}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
