import { Link } from "@tanstack/react-router";

import { cn } from "@/shared/utils/cn";

import { formatCurrency, formatNumber } from "../../utils/formatters";
import type { OverviewArKpi, OverviewKpiMetric } from "../../utils/overview.types";

type StripItem = {
  key: string;
  label: string;
  count: number;
  openValue: number;
  href?: string;
  onClick?: () => void;
  warnWhenPositive?: boolean;
  ariaLabel: string;
};

interface OpenWorkStripProps {
  currency: string;
  openPq: OverviewKpiMetric;
  openSq: OverviewKpiMetric;
  openPo: OverviewKpiMetric;
  arPending: OverviewArKpi;
  onArClick: () => void;
}

function StripChip({ item, currency }: { item: StripItem; currency: string }) {
  const warn = Boolean(item.warnWhenPositive && item.count > 0);
  const className = cn(
    "group flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left transition-colors duration-150",
    "hover:border-zinc-300 hover:bg-zinc-50/80",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2",
    warn && "border-amber-200/90 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70",
  );

  const body = (
    <>
      <span className="text-[13px] font-medium text-zinc-500">{item.label}</span>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight text-zinc-950",
          warn && "text-amber-900",
        )}
      >
        {formatNumber(item.count)}
      </span>
      <span className="text-xs tabular-nums text-zinc-400">
        {formatCurrency(item.openValue, currency, true)} open
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link to={item.href} className={className} aria-label={item.ariaLabel}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.onClick} className={className} aria-label={item.ariaLabel}>
      {body}
    </button>
  );
}

export function OpenWorkStrip({
  currency,
  openPq,
  openSq,
  openPo,
  arPending,
  onArClick,
}: OpenWorkStripProps) {
  const items: StripItem[] = [
    {
      key: "pq",
      label: "Open PQ",
      count: openPq.count,
      openValue: openPq.openValue,
      href: openPq.href,
      ariaLabel: `Open purchase quotations, ${openPq.count} open`,
    },
    {
      key: "sq",
      label: "Open SQ",
      count: openSq.count,
      openValue: openSq.openValue,
      href: openSq.href,
      ariaLabel: `Open sales quotations, ${openSq.count} open`,
    },
    {
      key: "po",
      label: "Open PO",
      count: openPo.count,
      openValue: openPo.openValue,
      href: openPo.href,
      ariaLabel: `Open purchase orders, ${openPo.count} open`,
    },
    {
      key: "ar",
      label: "AR pending approval",
      count: arPending.count,
      openValue: arPending.openValue,
      onClick: onArClick,
      warnWhenPositive: true,
      ariaLabel: `AR invoices pending approval, ${arPending.count} open`,
    },
  ];

  return (
    <section aria-label="Open work" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <StripChip key={item.key} item={item} currency={currency} />
      ))}
    </section>
  );
}

export function OpenWorkStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex animate-pulse flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3.5"
        >
          <div className="h-3.5 w-20 rounded-md bg-zinc-200" />
          <div className="h-7 w-12 rounded-md bg-zinc-200" />
          <div className="h-3 w-16 rounded-md bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}
