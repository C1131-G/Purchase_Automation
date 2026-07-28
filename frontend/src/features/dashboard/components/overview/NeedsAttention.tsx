import { cn } from "@/shared/utils/cn";

import { formatCurrency, formatNumber } from "../../utils/formatters";
import { overviewMotionClass } from "../../utils/overview.motion";
import {
  OVERVIEW_AR_ROW_HEIGHT_REM,
  OVERVIEW_AR_VISIBLE_ROWS,
  overviewArListMaxHeightRem,
} from "../../utils/overview.layout";
import type { OverviewArApprovalItem } from "../../utils/overview.types";

interface NeedsAttentionProps {
  items: OverviewArApprovalItem[];
  currency: string;
}

function formatDocDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function docLabel(item: OverviewArApprovalItem): string {
  if (item.docNum !== null && item.docNum > 0) {
    return String(item.docNum);
  }
  return item.isDraft ? `Draft ${item.docEntry}` : String(item.docEntry);
}

/**
 * AR invoice drafts (ODRF) and approval-pending items for the overview panel.
 */
export function NeedsAttention({ items, currency }: NeedsAttentionProps) {
  const hasMore = items.length > OVERVIEW_AR_VISIBLE_ROWS;
  const listMaxHeight = `${overviewArListMaxHeightRem}rem`;

  return (
    <section
      aria-label="AR invoice drafts"
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm shadow-amber-50/80"
    >
      <div className="border-b border-amber-100/90 bg-gradient-to-r from-amber-50/90 via-white to-white px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-amber-950">
              AR invoice drafts pending review
            </h2>
            {hasMore ? (
              <p className="mt-1 text-xs text-amber-800/70">Scroll the list for more</p>
            ) : null}
          </div>
          {items.length > 0 ? (
            <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold tabular-nums text-amber-900">
              {formatNumber(items.length)}
            </span>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div
          className={cn("flex flex-1 flex-col justify-center px-5 py-8", overviewMotionClass.empty)}
        >
          <p className="text-sm font-medium text-zinc-700">No AR invoice drafts waiting.</p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
            Open AR invoice drafts from ODRF (including IC Flow 2 partner drafts) appear here,
            newest first.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="hidden shrink-0 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)_minmax(0,4rem)_minmax(0,5rem)] gap-2 border-b border-amber-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800/50 sm:grid">
            <span>Doc</span>
            <span>Customer</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Age</span>
            <span className="text-right">Status</span>
          </div>

          <ul
            className="needs-attention-scroll flex min-h-0 flex-col overflow-y-auto overscroll-contain"
            style={{ maxHeight: listMaxHeight }}
            role="list"
            aria-label={
              hasMore
                ? `AR invoice drafts, showing ${OVERVIEW_AR_VISIBLE_ROWS} at a time, ${items.length} total`
                : `AR invoice drafts, ${items.length} total`
            }
          >
            {items.map((item) => {
              const name = item.cardName?.trim() || item.cardCode || "—";
              const code = item.cardCode?.trim();
              const showCode = Boolean(code && code !== name);

              return (
                <li
                  key={`${item.wddCode}-${item.docEntry}`}
                  className="grid shrink-0 grid-cols-1 gap-1.5 border-b border-amber-50/80 px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)_minmax(0,4rem)_minmax(0,5rem)] sm:items-center sm:gap-2 sm:py-0"
                  style={{ minHeight: `${OVERVIEW_AR_ROW_HEIGHT_REM}rem` }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tabular-nums text-zinc-900">
                      {docLabel(item)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                      {item.isDraft ? "Draft · " : ""}
                      {formatDocDate(item.docDate)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-800">{name}</p>
                    {showCode ? (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">{code}</p>
                    ) : item.requester ? (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                        By {item.requester}
                      </p>
                    ) : null}
                  </div>

                  <p className="text-sm font-medium tabular-nums text-zinc-900 sm:text-right">
                    {formatCurrency(item.docTotal, currency)}
                  </p>

                  <p className="text-sm tabular-nums text-zinc-600 sm:text-right">
                    <span className="text-xs text-zinc-400 sm:hidden">Age · </span>
                    {item.ageDays}d
                  </p>

                  <div className="sm:text-right">
                    <span className="inline-flex rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-100">
                      {item.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <p className="border-t border-amber-50 bg-amber-50/40 px-5 py-2 text-center text-[11px] text-amber-800/70">
              {items.length - OVERVIEW_AR_VISIBLE_ROWS} more below — scroll the list
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
