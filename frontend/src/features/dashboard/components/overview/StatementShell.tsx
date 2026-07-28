import { Link } from "@tanstack/react-router";
import { Download, Info } from "lucide-react";

import { cn } from "@/shared/utils/cn";

import { formatCurrency } from "../../utils/formatters";
import type {
  OverviewAging,
  OverviewPartnerSelection,
  OverviewStatement,
} from "../../utils/overview.types";
import { resolveStatementView } from "../../utils/overview.types";
import { overviewMotionClass } from "../../utils/overview.motion";
import { toStatementPartnerTableLink } from "../../utils/statement-partner-table-link";
import {
  balanceCaptionForRole,
  creditUtilizationPercent,
  exportStatementCsv,
  hasBalanceAgingGap,
  partnerRoleFromCardType,
  resolveStatementBalanceRole,
  sumAgingTotal,
  sumOverdueAging,
} from "../../utils/statement.utils";

interface StatementShellProps {
  selection: OverviewPartnerSelection;
  partnerCount: number;
  statement: OverviewStatement;
  currency: string;
  asOf?: string;
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
    return `All connected partners (${partnerCount})`;
  }

  const name = selection.cardName?.trim() || selection.cardCode;
  const company = selection.partnerCompanyName?.trim();
  const role = selection.role === "vendor" ? "Vendor" : "Customer";
  return company ? `${role} ${name} · ${company}` : `${role} ${name}`;
}

function formatAsOfLabel(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
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
    tile: "border-zinc-200/90 bg-zinc-50/90",
    labelColor: "text-zinc-600",
  },
  {
    key: "d31_60",
    label: "31–60",
    tile: "border-zinc-300/80 bg-zinc-100/70",
    labelColor: "text-zinc-700",
  },
  {
    key: "d61_90",
    label: "61–90",
    tile: "border-amber-200/90 bg-amber-50/80",
    labelColor: "text-amber-800",
  },
  {
    key: "d90_plus",
    label: "90+",
    tile: "border-rose-200/90 bg-rose-50/80",
    labelColor: "text-rose-800",
  },
];

function selectionKey(selection: OverviewPartnerSelection): string {
  if (selection.kind === "all") return "all";
  return `${selection.mappingId}:${selection.role}:${selection.cardCode}`;
}

function AgingTile({
  label,
  sublabel,
  value,
  tileClassName,
  labelClassName,
  hasValue,
  currency,
}: {
  label: string;
  sublabel?: string;
  value: number;
  tileClassName: string;
  labelClassName: string;
  hasValue: boolean;
  currency: string;
}) {
  return (
    <div className={cn("rounded-xl border px-3.5 py-3 shadow-sm shadow-white/40", tileClassName)}>
      <p className={cn("text-[11px] font-semibold", labelClassName)}>{label}</p>
      {sublabel ? (
        <p className={cn("mt-0.5 text-[10px] font-medium", labelClassName, "opacity-80")}>
          {sublabel}
        </p>
      ) : null}
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
  asOf,
}: StatementShellProps) {
  const view = resolveStatementView(selection, statement, partnerCount);
  const { balance, aging, showEmptyPartner, selectedPartner } = view;

  const caption = selectionCaption(selection, partnerCount, statement.partners.length > 0);
  const asOfLabel = formatAsOfLabel(asOf);
  const openAgingTotal = sumAgingTotal(aging);
  const overdueTotal = sumOverdueAging(aging);
  const isEmpty = partnerCount === 0 || showEmptyPartner;
  const showPartnerBreakdown = selection.kind === "all" && statement.partners.length > 0;

  const balanceRole = resolveStatementBalanceRole(
    selection.kind,
    selection.kind === "partner" ? selection.role : undefined,
  );
  const balanceCopy = balanceCaptionForRole(balanceRole);

  const displayCurrency = selectedPartner?.currency?.trim() || currency;

  const showGapHint = !isEmpty && hasBalanceAgingGap(balance, openAgingTotal);
  const creditLine = selectedPartner?.creditLine ?? null;
  const creditUsed = creditUtilizationPercent(balance, creditLine);

  return (
    <section
      id="overview-statement"
      aria-label="Statement"
      className="flex min-h-[200px] flex-col scroll-mt-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-100/60"
    >
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50/90 via-white to-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Statement</h2>
            <p className="mt-1 text-xs text-zinc-500">{caption}</p>
            {asOfLabel ? <p className="mt-1 text-[11px] text-zinc-400">As of {asOfLabel}</p> : null}
          </div>
          {statement.partners.length > 0 ? (
            <button
              type="button"
              onClick={() => exportStatementCsv(statement, currency, asOf)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
            >
              <Download className="size-3.5" aria-hidden />
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      <div
        key={selectionKey(selection)}
        className={cn(
          "flex flex-1 flex-col gap-5 p-5",
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
            <div className="flex gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3.5 py-3 text-xs leading-relaxed text-zinc-600">
              <Info className="mt-0.5 size-3.5 shrink-0 text-blue-600" aria-hidden />
              <p>
                <b>Balance</b> is the SAP partner account total from{" "}
                <code className="text-[11px]">OCRD</code>.<b> Aging</b> is unpaid open invoice
                amounts only (
                {balanceRole === "vendor"
                  ? "A/P"
                  : balanceRole === "customer"
                    ? "A/R"
                    : "A/P or A/R"}
                ). They may differ when payments, credits, or journals are on the account.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {AGING_BUCKETS.map((bucket) => {
                const value = aging[bucket.key];
                return (
                  <AgingTile
                    key={bucket.key}
                    currency={displayCurrency}
                    hasValue={value !== 0}
                    label={`${bucket.label} days`}
                    labelClassName={bucket.labelColor}
                    tileClassName={bucket.tile}
                    value={value}
                  />
                );
              })}
              <AgingTile
                currency={displayCurrency}
                hasValue={overdueTotal !== 0}
                label="Overdue"
                labelClassName="text-rose-800"
                sublabel="31+ days open"
                tileClassName="border-rose-200/90 bg-rose-50/80"
                value={overdueTotal}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100/90 bg-gradient-to-br from-blue-50/50 via-white to-zinc-50/40 px-4 py-3.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-semibold text-zinc-900">{balanceCopy.title}</span>
                <span className="text-[11px] text-zinc-500">{balanceCopy.hint}</span>
                {selectedPartner?.isFrozen ? (
                  <span className="mt-1 inline-flex w-fit rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                    Partner frozen in SAP
                  </span>
                ) : null}
                {creditUsed != null ? (
                  <span className="mt-1 text-[11px] text-zinc-500">
                    Credit used: {creditUsed}% of {formatCurrency(creditLine ?? 0, displayCurrency)}
                  </span>
                ) : null}
              </div>
              <span className="text-lg font-semibold tabular-nums tracking-tight text-blue-900">
                {formatCurrency(balance, displayCurrency)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs font-medium text-zinc-500">Open invoice aging total</span>
              <span className="text-sm font-semibold tabular-nums text-zinc-800">
                {formatCurrency(openAgingTotal, displayCurrency)}
              </span>
            </div>

            {showGapHint ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-[11px] leading-relaxed text-amber-900/85">
                Balance and aging total differ — common causes: unallocated payments, credit memos,
                or journal postings not tied to open invoices.
              </p>
            ) : null}

            {showPartnerBreakdown ? (
              <div className="overflow-hidden rounded-xl border border-zinc-100">
                <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
                  <h3 className="text-xs font-semibold text-zinc-700">Partner breakdown</h3>
                </div>
                <ul className="divide-y divide-zinc-100" role="list">
                  {statement.partners.map((partner) => {
                    const role = partnerRoleFromCardType(partner.cardType);
                    const partnerCurrency = partner.currency?.trim() || currency;
                    const partnerOverdue = sumOverdueAging(partner.aging);
                    const tableLink = toStatementPartnerTableLink(role, partner.cardCode);
                    const roleLabel = role === "vendor" ? "Vendor" : "Customer";
                    const openDocsLabel =
                      role === "vendor" ? "open A/P invoices" : "open sales quotations";

                    return (
                      <li
                        key={`${partner.cardType}:${partner.cardCode}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <Link
                          to={tableLink.to}
                          search={tableLink.search as never}
                          className="min-w-0 flex-1 text-left transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2"
                          aria-label={`View ${openDocsLabel} for ${roleLabel} ${partner.cardName}`}
                        >
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {partner.cardName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            {roleLabel} · {partner.cardCode}
                            {partner.isFrozen ? " · Frozen" : ""}
                          </p>
                        </Link>
                        <div className="flex flex-wrap items-center gap-4 text-right text-xs tabular-nums">
                          <div>
                            <p className="text-[10px] font-medium text-zinc-400">Balance</p>
                            <p className="font-semibold text-zinc-800">
                              {formatCurrency(partner.balance, partnerCurrency, true)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-zinc-400">Overdue</p>
                            <p className="font-semibold text-rose-700">
                              {formatCurrency(partnerOverdue, partnerCurrency, true)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
