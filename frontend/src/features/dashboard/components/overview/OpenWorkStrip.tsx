import { Link } from "@tanstack/react-router";
import { ClipboardList, FileText, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/utils/cn";

import { formatCurrency, formatNumber } from "../../utils/formatters";
import type { OverviewKpiMetric } from "../../utils/overview.types";
import { overviewMotionClass } from "../../utils/overview.motion";

type ChipTone = "sky" | "indigo" | "blue" | "amber";

type StripItem = {
  key: string;
  label: string;
  count: number;
  openValue: number;
  href?: string;
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
}

const TONE: Record<
  ChipTone,
  { card: string; iconWell: string; icon: string; count: string; hover: string }
> = {
  sky: {
    card: "border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-white",
    iconWell: "bg-sky-100 text-sky-700",
    icon: "text-sky-700",
    count: "text-sky-950",
    hover: "hover:border-sky-300 hover:shadow-sky-100/80",
  },
  indigo: {
    card: "border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-white",
    iconWell: "bg-indigo-100 text-indigo-700",
    icon: "text-indigo-700",
    count: "text-indigo-950",
    hover: "hover:border-indigo-300 hover:shadow-indigo-100/80",
  },
  blue: {
    card: "border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-white",
    iconWell: "bg-blue-100 text-blue-700",
    icon: "text-blue-700",
    count: "text-blue-950",
    hover: "hover:border-blue-300 hover:shadow-blue-100/80",
  },
  amber: {
    card: "border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-white",
    iconWell: "bg-amber-100 text-amber-800",
    icon: "text-amber-800",
    count: "text-amber-950",
    hover: "hover:border-amber-300 hover:shadow-amber-100/80",
  },
};

function StripChip({ item, currency }: { item: StripItem; currency: string }) {
  const warn = Boolean(item.warnWhenPositive && item.count > 0);
  const tone = warn ? TONE.amber : TONE[item.tone];
  const Icon = item.Icon;

  const className = cn(
    "group flex flex-col gap-3 rounded-2xl border px-5 py-5 text-left shadow-sm shadow-zinc-100/60",
    "transition-[transform,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "active:scale-[0.98]",
    "motion-safe:hover:-translate-y-px",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2",
    tone.card,
    tone.hover,
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold tracking-tight text-zinc-600">{item.label}</span>
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
      <span className="text-xs tabular-nums text-zinc-500">
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

export function OpenWorkStrip({ currency, openPq, openSq, openPo }: OpenWorkStripProps) {
  const items: StripItem[] = [
    {
      key: "pq",
      label: "Open PQ",
      count: openPq.count,
      openValue: openPq.openValue,
      href: openPq.href,
      ariaLabel: `Open purchase quotations, ${openPq.count} open`,
      tone: "sky",
      Icon: ClipboardList,
    },
    {
      key: "sq",
      label: "Open SQ",
      count: openSq.count,
      openValue: openSq.openValue,
      href: openSq.href,
      ariaLabel: `Open sales quotations, ${openSq.count} open`,
      tone: "indigo",
      Icon: FileText,
    },
    {
      key: "po",
      label: "Open PO",
      count: openPo.count,
      openValue: openPo.openValue,
      href: openPo.href,
      ariaLabel: `Open purchase orders, ${openPo.count} open`,
      tone: "blue",
      Icon: ShoppingCart,
    },
  ];

  return (
    <section
      aria-label="Open work"
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3", overviewMotionClass.chipStagger)}
    >
      {items.map((item) => (
        <StripChip key={item.key} item={item} currency={currency} />
      ))}
    </section>
  );
}

export function OpenWorkStripSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-hidden>
      {[
        "border-sky-100 bg-sky-50/40",
        "border-indigo-100 bg-indigo-50/40",
        "border-blue-100 bg-blue-50/40",
      ].map((tone, i) => (
        <div
          key={tone}
          className={cn(
            "flex animate-pulse flex-col gap-3 rounded-2xl border px-5 py-5 shadow-sm",
            tone,
          )}
        >
          <div className="flex justify-between">
            <div className="h-3.5 w-20 rounded-md bg-white/80" />
            <div className="size-9 rounded-xl bg-white/70" />
          </div>
          <div className="h-8 w-14 rounded-md bg-white/80" />
          <div className="h-3 w-20 rounded-md bg-white/60" />
          <span className="sr-only">Loading chip {i + 1}</span>
        </div>
      ))}
    </div>
  );
}
