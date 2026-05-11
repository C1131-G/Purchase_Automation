// SuggestionList: A high-performance, keyboard-accessible dropdown for lookup hints.
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

interface SuggestionListProps {
  items: CreateLookupOption[];
  onSelect: (item: CreateLookupOption) => void;
  emptyText?: string;
  floating?: boolean;
  showStock?: boolean;
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

  const gridLayout = showStock ? "grid-cols-[minmax(0,1fr)_56px]" : "grid-cols-[minmax(0,1fr)]";

  const outerClass =
    containerClassName ??
    (floating
      ? "absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white"
      : "-mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white");

  return (
    <div className={outerClass}>
      <div
        ref={listRef}
        className={`${maxHeight} overflow-auto`}
        onScroll={scrollable ? handleScroll : undefined}
      >
        {visibleItems.length === 0 ? (
          <div className="px-3 py-3 text-sm text-zinc-500">{emptyText}</div>
        ) : null}
        {visibleItems.length > 0 && (
          <div className="sticky top-0 z-10 border-b border-zinc-100 bg-zinc-50 px-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Name
            </span>
          </div>
        )}
        {visibleItems.map((item) => (
          <button
            key={item.code}
            type="button"
            disabled={item.disabled}
            className={`grid w-full cursor-pointer ${gridLayout} gap-x-2 items-center border-b border-zinc-100 px-3 py-2 text-left transition last:border-b-0 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50 disabled:hover:bg-transparent`}
            onMouseDown={(event) => {
              if (item.disabled) {
                return;
              }
              event.preventDefault();
              onSelect(item);
            }}
          >
            <span className="text-sm leading-tight text-zinc-800 transition-colors py-0.5 truncate">
              {item.name}
            </span>
            {showStock && (
              <span className="text-[11px] font-medium text-zinc-600 text-right">
                {typeof item.stock === "number" ? item.stock : "-"}
              </span>
            )}
          </button>
        ))}
        {loadingMore ? (
          <div className="flex items-center justify-center px-3 py-2 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
