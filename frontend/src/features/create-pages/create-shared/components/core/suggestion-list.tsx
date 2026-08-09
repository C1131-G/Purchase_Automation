// SuggestionList: A high-performance, keyboard-accessible dropdown for lookup hints.
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

interface SuggestionListProps {
  items: CreateLookupOption[];
  onSelect: (item: CreateLookupOption) => void;
  emptyText?: string;
  floating?: boolean;
  showCode?: boolean;
  codeOnly?: boolean;
  showStock?: boolean;
  codeLabel?: string;
  nameLabel?: string;
  maxHeight?: string;
  containerClassName?: string;
  query?: string;
  scrollable?: boolean;
}

export function SuggestionList({
  items,
  onSelect,
  emptyText = "No records found",
  floating = false,
  showStock = false,
  showCode = false,
  codeOnly = false,
  codeLabel = "Code",
  nameLabel = "Name",
  maxHeight = "max-h-[190px]",
  containerClassName,
  query = "",
  scrollable = true,
}: SuggestionListProps) {
  const INITIAL_LIMIT = 10;
  const STEP = 10;
  const MAX_LIMIT = 100;
  const listRef = useRef<HTMLDivElement>(null);
  const prevQueryRef = useRef(query.trim());
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  const [loadingMore, setLoadingMore] = useState(false);
  const trimmedQuery = query.trim();
  const isSearchMode = trimmedQuery.length > 0;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prevQueryRef.current !== trimmedQuery) {
      setVisibleCount(INITIAL_LIMIT);
      setLoadingMore(false);
      prevQueryRef.current = trimmedQuery;
    }
  }, [trimmedQuery, items.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const cappedItems = useMemo(() => {
    if (isSearchMode) {
      return items;
    }
    return items.slice(0, MAX_LIMIT);
  }, [isSearchMode, items]);

  const visibleItems = useMemo(() => {
    if (isSearchMode) {
      return cappedItems;
    }
    return cappedItems.slice(0, visibleCount);
  }, [cappedItems, isSearchMode, visibleCount]);

  const canLoadMore = !isSearchMode && visibleItems.length < cappedItems.length;

  const handleScroll = () => {
    if (!canLoadMore || loadingMore) {
      return;
    }
    const node = listRef.current;
    if (!node) {
      return;
    }
    const threshold = 24;
    const reachedEnd = node.scrollHeight - node.scrollTop - node.clientHeight <= threshold;
    if (!reachedEnd) {
      return;
    }
    setLoadingMore(true);
    window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + STEP, MAX_LIMIT));
      setLoadingMore(false);
    }, 120);
  };

  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  const gridColumns = showCode
    ? "grid-cols-[80px_minmax(0,1fr)]"
    : showStock
      ? "grid-cols-[minmax(0,1fr)_56px]"
      : "grid-cols-[minmax(0,1fr)]";

  const outerClass =
    containerClassName ??
    (floating
      ? "absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-xl border border-linen-200 bg-surface shadow-lg"
      : "-mt-3 overflow-hidden rounded-xl border border-linen-200 bg-surface");

  return (
    <div className={outerClass}>
      {visibleItems.length > 0 && (
        <div
          className={`border-b border-linen-100 bg-linen-50 pl-3 py-1 ${scrollable ? "pr-[29px]" : "pr-3"}`}
        >
          {showCode ? (
            <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                {codeLabel}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                {nameLabel}
              </span>
            </div>
          ) : showStock ? (
            <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-x-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                {codeOnly ? codeLabel : nameLabel}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                Stock
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              {codeOnly ? codeLabel : nameLabel}
            </span>
          )}
        </div>
      )}
      <div
        ref={listRef}
        className={`${maxHeight} ${scrollable ? "overflow-y-scroll" : "overflow-auto"} relative`}
        onScroll={scrollable ? handleScroll : undefined}
      >
        {visibleItems.length === 0 ? (
          <div className="px-3 py-3 text-sm text-neutral-500">{emptyText}</div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = visibleItems[virtualRow.index]!;
              return (
                <button
                  key={item.code}
                  type="button"
                  disabled={item.disabled}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={`grid w-full cursor-pointer ${gridColumns} gap-x-2 items-center border-b border-linen-100 px-3 py-2 text-left transition last:border-b-0 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-linen-50 disabled:hover:bg-transparent`}
                  onMouseDown={(event) => {
                    if (item.disabled) {
                      return;
                    }
                    event.preventDefault();
                    onSelect(item);
                  }}
                >
                  {showCode && (
                    <span className="text-[11px] text-neutral-500 truncate">{item.code}</span>
                  )}
                  <span className="text-sm leading-tight text-ink-900 transition-colors py-0.5 truncate">
                    {codeOnly ? item.code : item.name}
                  </span>
                  {showStock && (
                    <span className="text-[11px] text-neutral-500">
                      {typeof item.stock === "number" ? item.stock : "-"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="flex items-center justify-center px-3 py-2 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
