import { cn } from "@/shared/utils/cn";

import { formatCurrency } from "../../utils/formatters";
import type {
  OverviewAging,
  OverviewPartnerSelection,
  OverviewStatement,
} from "../../utils/overview.types";
import { resolveStatementView } from "../../utils/overview.types";
import { overviewMotionClass } from "../../utils/overview.motion";

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

const AGING_BUCKETS: {
  key: keyof OverviewAging;
  label: string;
  tile: string;
  labelColor: string;
}[] = [
  {
    key: "d0_30",
    label: "0–30",
    tile: "border-emerald-100 bg-emerald-50/50",
    labelColor: "text-emerald-700",
  },
  {
    key: "d31_60",
    label: "31–60",
    tile: "border-sky-100 bg-sky-50/50",
    labelColor: "text-sky-700",
  },
  {
    key: "d61_90",
    label: "61–90",
    tile: "border-amber-100 bg-amber-50/50",
    labelColor: "text-amber-700",
  },
  {
    key: "d90_plus",
    label: "90+",
    tile: "border-rose-100 bg-rose-50/50",
    labelColor: "text-rose-700",
  },
];

function selectionKey(selection: OverviewPartnerSelection): string {
  if (selection.kind === "all") return "all";
  return `${selection.mappingId}:${selection.role}:${selection.cardCode}`;
}

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
  const isEmpty = partnerCount === 0 || showEmptyPartner;

  return (
    <section
      id="overview-statement"
      aria-label="Statement"
      className="flex min-h-[200px] flex-col scroll-mt-4 overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm shadow-teal-50/70"
    >
      <div className="border-b border-teal-100/90 bg-gradient-to-r from-teal-50/90 via-white to-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-teal-950">Statement</h2>
            <p className="mt-1 text-xs text-teal-800/65">{caption}</p>
          </div>
          <span className="rounded-lg border border-teal-200/80 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-900">
            Filter: {filterLabel}
          </span>
        </div>
      </div>

      <div
        key={selectionKey(selection)}
        className={cn(
          "flex flex-1 flex-col justify-center gap-5 p-5",
          isEmpty ? overviewMotionClass.empty : overviewMotionClass.filterSwap,
        )}
      >
        {partnerCount === 0 ? (
          <p className="text-center text-sm text-zinc-600">
            Connect intercompany partners to load balances and aging.
          </p>
        ) : showEmptyPartner ? (
          <p className="text-center text-sm text-zinc-600">
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
                    className={cn(
                      "rounded-xl border px-3.5 py-3 shadow-sm shadow-white/40",
                      bucket.tile,
                    )}
                  >
                    <p className={cn("text-[11px] font-semibold", bucket.labelColor)}>
                      {bucket.label} days
                    </p>
                    <p
                      className={cn(
                        "mt-1.5 text-sm font-semibold tabular-nums",
                        hasValue ? "text-zinc-900" : "text-zinc-400",
                      )}
                    >
                      {formatCurrency(value, currency, true)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50/40 px-4 py-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-teal-900">Balance</span>
                <span className="text-[11px] text-teal-800/60">OCRD account balance</span>
              </div>
              <span className="text-lg font-semibold tabular-nums tracking-tight text-teal-950">
                {formatCurrency(balance, currency)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs font-medium text-zinc-500">Open invoice aging total</span>
              <span className="text-sm font-semibold tabular-nums text-zinc-800">
                {formatCurrency(openAgingTotal, currency)}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
