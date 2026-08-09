import { Link } from "@tanstack/react-router";
import { ClipboardList, FileText, ShoppingCart, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/utils/cn";

import { formatCurrency, formatNumber } from "../../utils/formatters";
import type { OverviewArKpi, OverviewKpiMetric } from "../../utils/overview.types";
import { overviewMotionClass } from "../../utils/overview.motion";
import type { OpenDocTableLink } from "../../utils/open-doc-table-link";
import { toOpenDocTableLink } from "../../utils/open-doc-table-link";

type ChipTone = "teal" | "ink" | "linen" | "amber";

type StripItem = {
  key: string;
  label: string;
  count: number;
  openValue: number;
  tableLink?: OpenDocTableLink;
  onClick?: () => void;
  warnWhenPositive?: boolean;
  ariaLabel: string;
  tone: ChipTone;
  Icon: LucideIcon;
};

interface OpenWorkStripProps {
  currency: string;
  openPq: OverviewKpiMetric;
  openSq: OverviewKpiMetric;
  openPo: OverviewKpiMetric;
  arPending: OverviewArKpi;
  onArClick: () => void;
}

const TONE: Record<
  ChipTone,
  { card: string; iconWell: string; icon: string; count: string; hover: string }
> = {
  teal: {
    card: "border-teal-200 bg-surface shadow-sm",
    iconWell: "bg-teal-600 text-surface",
    icon: "text-surface",
    count: "text-ink-900",
    hover: "hover:border-teal-300 hover:shadow-teal-100/60",
  },
  ink: {
    card: "border-linen-200 bg-surface shadow-sm",
    iconWell: "bg-ink-900 text-surface",
    icon: "text-surface",
    count: "text-ink-900",
    hover: "hover:border-ink-900/20 hover:shadow-ink-900/5",
  },
  linen: {
    card: "border-linen-200 bg-surface shadow-sm",
    iconWell: "bg-linen-200 text-ink-900",
    icon: "text-ink-900",
    count: "text-ink-900",
    hover: "hover:border-linen-300 hover:shadow-linen-100/80",
  },
  amber: {
    card: "border-amber-200 bg-amber-50 shadow-sm",
    iconWell: "bg-amber-500 text-surface",
    icon: "text-surface",
    count: "text-amber-900",
    hover: "hover:border-amber-300 hover:shadow-amber-100/60",
  },
};

function StripChip({ item, currency }: { item: StripItem; currency: string }) {
  const warn = Boolean(item.warnWhenPositive && item.count > 0);
  const tone = warn ? TONE.amber : TONE[item.tone];
  const Icon = item.Icon;

  const className = cn(
    "group flex cursor-pointer flex-col gap-3 rounded-2xl border px-5 py-5 text-left shadow-sm shadow-linen-100/60",
    "transition-[transform,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "active:scale-[0.98]",
    "motion-safe:hover:-translate-y-px",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2",
    tone.card,
    tone.hover,
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold tracking-tight text-neutral-600">
          {item.label}
        </span>
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
            tone.iconWell,
          )}
          aria-hidden
        >
          <Icon className={cn("size-4", tone.icon)} strokeWidth={2.25} />
        </span>
      </div>
      <span className={cn("text-3xl font-semibold tabular-nums tracking-tight", tone.count)}>
        {formatNumber(item.count)}
      </span>
      <span className="text-xs tabular-nums text-neutral-500">
        {formatCurrency(item.openValue, currency, true)} open
      </span>
    </>
  );

  if (item.tableLink) {
    return (
      <Link
        to={item.tableLink.to}
        search={item.tableLink.search as never}
        className={className}
        aria-label={item.ariaLabel}
      >
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
      tableLink: toOpenDocTableLink(openPq.href),
      ariaLabel: `Open purchase quotations, ${openPq.count} open`,
      tone: "teal",
      Icon: ClipboardList,
    },
    {
      key: "sq",
      label: "Open SQ",
      count: openSq.count,
      openValue: openSq.openValue,
      tableLink: toOpenDocTableLink(openSq.href),
      ariaLabel: `Open sales quotations, ${openSq.count} open`,
      tone: "ink",
      Icon: FileText,
    },
    {
      key: "po",
      label: "Open PO",
      count: openPo.count,
      openValue: openPo.openValue,
      tableLink: toOpenDocTableLink(openPo.href),
      ariaLabel: `Open purchase orders, ${openPo.count} open`,
      tone: "linen",
      Icon: ShoppingCart,
    },
    {
      key: "ar",
      // A/R Invoice Drafts (ODRF) — listed on the dashboard panel (no separate route).
      label: "Open AR drafts",
      count: arPending.count,
      openValue: arPending.openValue,
      onClick: onArClick,
      warnWhenPositive: true,
      ariaLabel: `Open AR drafts, ${arPending.count} open — show list on this page`,
      tone: "amber",
      Icon: ShieldAlert,
    },
  ];

  return (
    <section
      aria-label="Open work"
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", overviewMotionClass.chipStagger)}
    >
      {items.map((item) => (
        <StripChip key={item.key} item={item} currency={currency} />
      ))}
    </section>
  );
}

export function OpenWorkStripSkeleton() {
  const chipTones = [
    {
      card: "border-teal-200 bg-surface",
      well: "bg-teal-600",
    },
    {
      card: "border-linen-200 bg-surface",
      well: "bg-ink-900",
    },
    {
      card: "border-linen-200 bg-surface",
      well: "bg-linen-200",
    },
    {
      card: "border-amber-200 bg-amber-50",
      well: "bg-amber-500",
    },
  ] as const;

  return (
    <section
      aria-label="Open work"
      aria-busy="true"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {chipTones.map((tone, index) => (
        <div
          key={tone.card}
          className={cn(
            "flex animate-pulse flex-col gap-3 rounded-2xl border px-5 py-5 shadow-sm shadow-linen-100/60",
            tone.card,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="h-3.5 w-20 rounded-md bg-surface/70" />
            <div className={cn("size-9 rounded-xl", tone.well)} />
          </div>
          <div className="h-8 w-14 rounded-md bg-surface/75" />
          <div className="h-3 w-24 rounded-md bg-surface/55" />
          <span className="sr-only">Loading KPI chip {index + 1}</span>
        </div>
      ))}
    </section>
  );
}
