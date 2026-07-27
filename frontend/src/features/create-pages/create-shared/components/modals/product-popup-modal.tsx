import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentProps } from "react";

// ProductPopupModal: Orchestrates item selection, stock validation, and price lookup.
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import {
  EMPTY_SET,
  useClosePickerAction,
  useOpenPickerAction,
  useSelectedCodesForKey,
  useSelectSingleAction,
  useToggleCodeAction,
} from "@/store/create/product-picker.store";

interface ProductPopupModalProps {
  open: ComponentProps<typeof AnimatedModalShell>["open"];
  warehouseCode?: string;
  search: string;
  results: ProductLookupItem[];
  loading: boolean;
  backgroundLoading?: boolean;
  error: string | null;
  onRetry?: () => void;
  onSearchChange: (value: string) => void;
  onReachEnd?: () => void;
  onClose: ComponentProps<typeof AnimatedModalShell>["onClose"];
  onSelect: (product: ProductLookupItem) => void;
  onSelectMultiple?: (products: ProductLookupItem[]) => void;
  /** The product code of the currently active row, used to seed selection state. */
  selectedProductCode?: string | null | undefined;
  /** The row ID being edited — used as key for persisted selection state. */
  selectedProductRowId?: string | null | undefined;
}

const popupScrollState = new Map<string, number>();

const SKELETON_ROW_KEYS = ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6"] as const;

const ProductPopupRow = memo(function ProductPopupRow({
  product,
  selected,
  onToggle,
  style,
}: {
  product: ProductLookupItem;
  selected: boolean;
  onToggle: () => void;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`grid grid-cols-[40px_140px_1fr_80px_100px] items-center border-b border-zinc-100 px-3 py-2 cursor-pointer transition-all text-sm ${
        selected ? "bg-blue-50/60 hover:bg-blue-100/70" : "hover:bg-blue-50/40"
      }`}
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      <div className="flex items-center justify-center -ml-[4px]">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-150 ${
            selected
              ? "border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20"
              : "border-zinc-300 bg-white"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </div>
      </div>
      <div className="text-zinc-700 truncate pr-3">{product.code}</div>
      <div className="text-zinc-700 truncate pr-3">{product.name}</div>
      <div className="text-zinc-700 truncate">{product.stock}</div>
      <div className="text-zinc-700 truncate">{product.price.toFixed(2)}</div>
    </div>
  );
});

export function ProductPopupModal({
  open,
  warehouseCode,
  search,
  results,
  loading,
  backgroundLoading = false,
  error,
  onRetry,
  onSearchChange,
  onReachEnd,
  onClose,
  onSelect,
  onSelectMultiple,
  selectedProductCode,
  selectedProductRowId,
}: ProductPopupModalProps) {
  const safeResults = useMemo(() => (Array.isArray(results) ? results : []), [results]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollKey = warehouseCode?.trim() || "__no_warehouse__";
  const emptyMessage = search.trim()
    ? `No products match "${search.trim()}".`
    : "No products available.";

  /* ---------- normalize optional props ---------- */
  const normalizedProductCode = selectedProductCode ?? null;
  // Use a stable fallback key for document-level search so selection works
  // even when no row ID is provided.
  const normalizedRowId = selectedProductRowId ?? "__document_search__";

  /* ---------- store hooks ---------- */
  const pickerKey = normalizedRowId;
  const selectedCodes = useSelectedCodesForKey(pickerKey);
  const openPicker = useOpenPickerAction();
  const toggleCode = useToggleCodeAction();
  const selectSingle = useSelectSingleAction();
  const closePicker = useClosePickerAction();

  /* ---------- detect mode ---------- */
  // Row-level editing: single-select — click replaces and auto-applies.
  // Document-level search: multi-select — click toggles, Confirm applies.
  const isRowLevel = selectedProductRowId != null && selectedProductRowId !== "__document_search__";

  /* ---------- always seed fresh on open — no persistence ---------- */
  useEffect(() => {
    if (!open) {
      return;
    }

    let targetCodes: Set<string>;

    if (normalizedProductCode) {
      // Row-level: seed with the row's current product code so user sees what's selected
      targetCodes = new Set([normalizedProductCode]);
    } else {
      // Document-level or empty row: start fresh
      targetCodes = EMPTY_SET;
    }

    openPicker(pickerKey, targetCodes);
  }, [open, pickerKey, normalizedProductCode, openPicker]);

  /* ---------- scroll restore ---------- */
  useEffect(() => {
    if (!open) {
      return;
    }
    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }
    const saved = popupScrollState.get(scrollKey);
    if (typeof saved === "number") {
      node.scrollTop = saved;
    }
  }, [open, scrollKey]);

  /* ---------- close handler ---------- */
  const handleInternalClose = useCallback(() => {
    closePicker(pickerKey);
    onSearchChange("");
    onClose();
  }, [pickerKey, closePicker, onSearchChange, onClose]);

  const handleAddSelected = useCallback(() => {
    if (!onSelectMultiple) {
      return;
    }
    const selectedProducts = safeResults.filter((p) => selectedCodes.has(p.code));
    if (selectedProducts.length > 0) {
      onSelectMultiple(selectedProducts);
    }
    onSearchChange("");
  }, [onSelectMultiple, safeResults, selectedCodes, onSearchChange]);

  /* ---------- row click handler ---------- */
  const handleProductSelect = useCallback(
    (product: ProductLookupItem) => {
      if (isRowLevel) {
        // Single-select: replace selection, apply immediately, close
        selectSingle(pickerKey, product.code);
        onSelect(product);
        onSearchChange("");
        closePicker(pickerKey);
        onClose();
      } else {
        // Multi-select: toggle selection, user clicks Confirm to apply
        toggleCode(pickerKey, product.code);
      }
    },
    [
      isRowLevel,
      pickerKey,
      selectSingle,
      toggleCode,
      onSelect,
      onSearchChange,
      closePicker,
      onClose,
    ],
  );

  const rowVirtualizer = useVirtualizer({
    count: safeResults.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <AnimatedModalShell open={open} onClose={handleInternalClose} panelClassName="max-w-4xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">Search Products</h3>
        <div className="flex items-center gap-2">
          {selectedCodes.size > 0 && onSelectMultiple && (
            <button
              onClick={handleAddSelected}
              className="flex h-8 items-center rounded-full border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              Confirm ({selectedCodes.size})
            </button>
          )}
          <button
            type="button"
            onClick={handleInternalClose}
            className="flex h-8 items-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="relative w-full">
            <input
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              placeholder="Search product code or name"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              autoComplete="off"
            />
          </div>
          {backgroundLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {loading && safeResults.length === 0 ? (
            <div className="p-4 space-y-2">
              {SKELETON_ROW_KEYS.map((slot) => (
                <div
                  key={`product-skeleton-${slot}`}
                  className="h-8 w-full animate-pulse rounded-lg bg-zinc-100"
                />
              ))}
            </div>
          ) : error && safeResults.length === 0 ? (
            <div className="flex flex-col items-center gap-2 bg-red-50 p-6 text-center border-b border-red-100">
              <p className="text-sm font-semibold text-red-800">Lookup unavailable</p>
              <p className="text-xs text-red-600 max-w-md">
                {error || "Unable to load products. Please try again."}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 rounded-full border border-red-200 bg-white px-4 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  Retry
                </button>
              )}
            </div>
          ) : safeResults.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-1 bg-zinc-50 px-4 py-8 text-center">
              <p className="text-xs font-medium text-zinc-500">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[40px_140px_1fr_80px_100px] items-center border-b border-zinc-200 bg-zinc-50 pl-3 pr-[29px] py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 sticky top-0 z-10">
                <div />
                <div>Code</div>
                <div>Name</div>
                <div>Stock</div>
                <div>Price</div>
              </div>

              <div
                ref={scrollContainerRef}
                className="max-h-80 overflow-y-scroll relative"
                onScroll={(event) => {
                  popupScrollState.set(scrollKey, event.currentTarget.scrollTop);
                  // Allow reach-end while previous rows stay visible (keepPreviousData /
                  // background warm). Only block when the list is empty skeleton-loading.
                  if (!onReachEnd || (loading && safeResults.length === 0)) {
                    return;
                  }
                  const target = event.currentTarget;
                  const threshold = 48;
                  const reachedEnd =
                    target.scrollHeight - target.scrollTop - target.clientHeight <= threshold;
                  if (reachedEnd) {
                    onReachEnd();
                  }
                }}
              >
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const product = safeResults[virtualRow.index]!;
                    return (
                      <ProductPopupRow
                        key={virtualRow.key}
                        product={product}
                        selected={selectedCodes.has(product.code)}
                        onToggle={() => handleProductSelect(product)}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AnimatedModalShell>
  );
}
