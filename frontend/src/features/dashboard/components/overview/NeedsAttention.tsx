import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/shared/utils/cn";

import { useArInvoiceDraftsInfinite } from "../../queries/queries";
import { formatCurrency, formatNumber } from "../../utils/formatters";
import {
  OVERVIEW_AR_ROW_HEIGHT_REM,
  OVERVIEW_AR_VISIBLE_ROWS,
  overviewArListMaxHeightRem,
} from "../../utils/overview.layout";
import { overviewMotionClass } from "../../utils/overview.motion";
import type { OverviewArApprovalItem, OverviewArKpi } from "../../utils/overview.types";

interface NeedsAttentionProps {
  /** KPI totals from overview (count / value); list pages load independently. */
  kpi: OverviewArKpi;
  currency: string;
  /** Optional first embed from overview while infinite query settles. */
  initialItems?: OverviewArApprovalItem[];
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
  return `Draft ${item.docEntry}`;
}

const ROW_HEIGHT_PX = OVERVIEW_AR_ROW_HEIGHT_REM * 16;

/**
 * A/R Invoice Drafts (ODRF) — virtualized infinite scroll, no hard 50-row cap.
 */
export function NeedsAttention({ kpi, currency, initialItems = [] }: NeedsAttentionProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const {
    data,
    isError,
    isFetchingNextPage,
    isLoading,
    isPending,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useArInvoiceDraftsInfinite();

  const items = useMemo(() => {
    const pages = data?.pages ?? [];
    if (pages.length === 0) {
      return initialItems;
    }
    return pages.flatMap((page) => page.items);
  }, [data?.pages, initialItems]);

  const totalCount = data?.pages[0]?.count ?? kpi.count;
  const listMaxHeight = `${overviewArListMaxHeightRem}rem`;
  const showVirtual = items.length > 0;
  const hasMoreHint = hasNextPage || items.length > OVERVIEW_AR_VISIBLE_ROWS;

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 6,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const lastVirtualIndex = virtualRows.length > 0 ? virtualRows[virtualRows.length - 1]?.index : -1;

  useEffect(() => {
    if (lastVirtualIndex == null || lastVirtualIndex < 0) {
      return;
    }
    const nearEnd = lastVirtualIndex >= items.length - 8;
    if (nearEnd && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length, lastVirtualIndex]);

  const empty =
    !isLoading && !isPending && items.length === 0 && (totalCount === 0 || isError === false);

  return (
    <section
      aria-label="Open AR drafts"
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm shadow-amber-50/80"
    >
      <div className="border-b border-amber-100/90 bg-gradient-to-r from-amber-50/90 via-white to-white px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-amber-950">Open AR drafts</h2>
            {hasMoreHint ? (
              <p className="mt-1 text-xs text-amber-800/70">Scroll for more · infinite list</p>
            ) : (
              <p className="mt-1 text-xs text-amber-800/70">
                Open A/R Invoice Drafts · including IC Flow 2 · no separate page
              </p>
            )}
          </div>
          {totalCount > 0 ? (
            <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold tabular-nums text-amber-900">
              {formatNumber(totalCount)}
            </span>
          ) : null}
        </div>
      </div>

      {isError && items.length === 0 ? (
        <div
          className={cn("flex flex-1 flex-col justify-center px-5 py-8", overviewMotionClass.empty)}
        >
          <p className="text-sm font-medium text-zinc-700">Couldn&apos;t load open AR drafts.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 self-start rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-200 hover:bg-amber-200/80"
          >
            Retry
          </button>
        </div>
      ) : empty ? (
        <div
          className={cn("flex flex-1 flex-col justify-center px-5 py-8", overviewMotionClass.empty)}
        >
          <p className="text-sm font-medium text-zinc-700">No open AR drafts.</p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
            Open A/R Invoice Drafts for this company appear here, including IC Flow 2 partner
            drafts. No separate navigation page is required.
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

          <div
            ref={listRef}
            className="needs-attention-scroll relative min-h-0 overflow-y-auto overscroll-contain"
            style={{ maxHeight: listMaxHeight }}
            role="list"
            aria-label={
              hasNextPage || items.length > OVERVIEW_AR_VISIBLE_ROWS
                ? `Open AR drafts, virtualized list, ${formatNumber(totalCount)} total`
                : `Open AR drafts, ${formatNumber(items.length)} total`
            }
          >
            {showVirtual ? (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                  width: "100%",
                }}
              >
                {virtualRows.map((virtualRow) => {
                  const item = items[virtualRow.index];
                  if (!item) return null;
                  const name = item.cardName?.trim() || item.cardCode || "—";
                  const code = item.cardCode?.trim();
                  const showCode = Boolean(code && code !== name);

                  return (
                    <div
                      key={`${item.wddCode}-${item.docEntry}`}
                      role="listitem"
                      data-index={virtualRow.index}
                      className="absolute top-0 left-0 grid w-full grid-cols-1 gap-1.5 border-b border-amber-50/80 px-5 py-3.5 sm:grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)_minmax(0,4rem)_minmax(0,5rem)] sm:items-center sm:gap-2 sm:py-0"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium tabular-nums text-zinc-900">
                          {docLabel(item)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-400">
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
                          {item.status || "Draft"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center px-5 py-10">
                <span className="text-xs font-medium text-amber-800/70">Loading drafts…</span>
              </div>
            )}
          </div>
          {isFetchingNextPage ? (
            <p className="border-t border-amber-50 bg-amber-50/40 px-5 py-2 text-center text-[11px] text-amber-800/70">
              Loading more drafts…
            </p>
          ) : hasNextPage ? (
            <p className="border-t border-amber-50 bg-amber-50/40 px-5 py-2 text-center text-[11px] text-amber-800/70">
              Scroll for more · {formatNumber(Math.max(0, totalCount - items.length))} remaining
            </p>
          ) : items.length > OVERVIEW_AR_VISIBLE_ROWS ? (
            <p className="border-t border-amber-50 bg-amber-50/40 px-5 py-2 text-center text-[11px] text-amber-800/70">
              End of list · {formatNumber(items.length)} drafts
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
