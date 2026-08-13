import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Loader2, Search, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";

export interface DocumentLookupItem {
  id: number;
  docNum: string | number;
  type: "it_PurchaseInvoice" | "it_PurchCredItnote";
  label: string;
  balanceDue: number;
}

interface DocumentLookupModalProps {
  open: boolean;
  search: string;
  results: DocumentLookupItem[];
  loading: boolean;
  selectedIds: Set<string>;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onToggle: (doc: DocumentLookupItem) => void;
}

const DOC_LOOKUP_ROW_ESTIMATE_PX = 44;
const DOC_LOOKUP_ROW_OVERSCAN = 6;

function rankResults(docs: DocumentLookupItem[], term: string) {
  const lower = term.toLowerCase();
  const scored = docs.map((doc) => {
    const num = doc.docNum?.toString() ?? "";
    const numLower = num.toLowerCase();
    const labelLower = doc.label.toLowerCase();

    if (numLower === lower) {
      return { doc, rank: 0 };
    }
    if (numLower.startsWith(lower)) {
      return { doc, rank: 1 };
    }
    if (numLower.includes(lower)) {
      return { doc, rank: 2 };
    }
    if (labelLower.includes(lower)) {
      return { doc, rank: 3 };
    }
    return { doc, rank: 4 };
  });

  return scored
    .filter((s) => s.rank < 4)
    .toSorted(
      (a, b) => a.rank - b.rank || a.doc.docNum.toString().localeCompare(b.doc.docNum.toString()),
    )
    .map((s) => s.doc);
}

export function DocumentLookupModal({
  open,
  search,
  results,
  loading,
  selectedIds,
  onSearchChange,
  onClose,
  onToggle,
}: DocumentLookupModalProps) {
  const availableResults = useMemo(() => results.filter((doc) => doc.balanceDue > 0), [results]);

  const rankedResults = useMemo(() => {
    const term = search.trim();
    if (!term) {
      return availableResults;
    }
    return rankResults(availableResults, term);
  }, [availableResults, search]);
  const selectedCount = selectedIds.size;

  return (
    <AnimatedModalShell open={open} onClose={onClose} panelClassName="max-w-lg">
      <div className="flex items-center justify-between border-b border-linen-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-ink-900">Select Documents</h3>
          {selectedCount > 0 && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
              {selectedCount} selected
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-linen-200 px-3 py-1 text-xs font-medium text-neutral-500 transition hover:bg-linen-100"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        <div className="relative mb-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            className="h-10 w-full rounded-xl border border-linen-200 bg-field-silver px-3 pl-10 pr-10 text-sm outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
            placeholder="Search by Doc No. or Type..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              className="pointer-events-auto absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-500"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <DocumentLookupResults
          key={search.trim()}
          loading={loading}
          results={rankedResults}
          search={search}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      </div>
    </AnimatedModalShell>
  );
}

function DocumentLookupResults({
  search,
  results,
  loading,
  selectedIds,
  onToggle,
}: {
  search: string;
  results: DocumentLookupItem[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggle: (doc: DocumentLookupItem) => void;
}) {
  const INITIAL_LIMIT = 10;
  const STEP = 10;
  const MAX_LIMIT = 100;
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const isSearchMode = search.trim().length > 0;
  const cappedResults = useMemo(
    () => (isSearchMode ? results : results.slice(0, MAX_LIMIT)),
    [results, isSearchMode],
  );
  const visibleResults = useMemo(
    () => (isSearchMode ? cappedResults : cappedResults.slice(0, visibleCount)),
    [cappedResults, isSearchMode, visibleCount],
  );
  const canLoadMore = !isSearchMode && visibleResults.length < cappedResults.length;

  const rowVirtualizer = useVirtualizer({
    count: visibleResults.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => DOC_LOOKUP_ROW_ESTIMATE_PX,
    overscan: DOC_LOOKUP_ROW_OVERSCAN,
    getItemKey: (index) => {
      const doc = visibleResults[index];
      return doc ? `${doc.type}-${doc.id}` : index;
    },
  });

  const handleTableScroll = useCallback(() => {
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
  }, [canLoadMore, loadingMore]);

  return (
    <div className="overflow-hidden rounded-xl border border-linen-200">
      <div ref={listRef} className="max-h-80 overflow-auto" onScroll={handleTableScroll}>
        {loading && visibleResults.length === 0 ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`doc-skeleton-${i}`}
                className="h-10 w-full animate-pulse rounded-lg bg-linen-100"
              />
            ))}
          </div>
        ) : visibleResults.length === 0 && !loading ? (
          <div className="px-3 py-4">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-linen-100 bg-linen-50 px-4 py-5 text-center">
              <p className="text-xs font-medium text-neutral-500">
                {search.trim()
                  ? `No results for "${search.trim()}".`
                  : "No open documents available."}
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const doc = visibleResults[virtualRow.index];
              if (!doc) {
                return null;
              }
              const key = `${doc.type}-${doc.id}`;
              const selected = selectedIds.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggle(doc)}
                  style={{
                    height: `${virtualRow.size}px`,
                    left: 0,
                    position: "absolute",
                    top: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    width: "100%",
                  }}
                  className={`flex w-full items-center gap-3 border-b border-linen-50 px-4 text-left transition ${
                    selected ? "bg-teal-50/70" : "hover:bg-linen-50"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition ${
                      selected
                        ? "border-teal-600 bg-teal-600 text-surface"
                        : "border-linen-200 bg-surface text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-sm font-semibold text-ink-900">{doc.docNum}</span>
                    <span
                      className={`text-xs font-medium ${
                        doc.type === "it_PurchaseInvoice" ? "text-teal-600" : "text-orange-600"
                      }`}
                    >
                      {doc.label}
                    </span>
                  </div>
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
