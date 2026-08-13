// ProductWarehouseStockModal: Displays real-time inventory levels across multiple warehouses.
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { LookupErrorState } from "@/components/lookup/lookup-error-state";
import type { ProductWarehouseStockItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import type { StockPreviewProduct } from "@/features/create-pages/create-shared/utils/create-order.types";

interface ProductWarehouseStockModalProps {
  open: ComponentProps<typeof AnimatedModalShell>["open"];
  product: StockPreviewProduct | null;
  currentWarehouseCode?: string;
  stocks: ProductWarehouseStockItem[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onClose: ComponentProps<typeof AnimatedModalShell>["onClose"];
  onAfterClose?: ComponentProps<typeof AnimatedModalShell>["onAfterClose"];
  onSelect?: (item: ProductWarehouseStockItem) => void;
  minSelectableStock?: number;
  /** Pre-fills the modal's search field when first opened (two-way sync with inline input). */
  initialSearch?: string;
  /** Called whenever the modal's search changes so the parent can sync the inline input. */
  onSearchChange?: (value: string) => void;
}

const SKELETON_ROW_KEYS = ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6"] as const;

export function ProductWarehouseStockModal({
  open,
  product,
  stocks,
  loading,
  error,
  onRetry,
  onClose,
  onAfterClose,
  onSelect,
  minSelectableStock = 0,
  initialSearch = "",
  onSearchChange,
}: ProductWarehouseStockModalProps) {
  const [warehouseSearch, setWarehouseSearch] = useState(initialSearch);
  const wasOpenRef = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setWarehouseSearch(initialSearch);
    }
    wasOpenRef.current = open;
  }, [open, initialSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
  const sortedStocks = useMemo(
    () => [...safeStocks].toSorted((a, b) => b.stock - a.stock || a.code.localeCompare(b.code)),
    [safeStocks],
  );
  const filteredStocks = useMemo(() => {
    const term = warehouseSearch.trim().toLowerCase();
    if (!term) {
      return sortedStocks;
    }
    return sortedStocks.filter(
      (stockItem) =>
        stockItem.code.toLowerCase().includes(term) || stockItem.name.toLowerCase().includes(term),
    );
  }, [sortedStocks, warehouseSearch]);

  const suggestionItems = useMemo(
    () =>
      filteredStocks.map((stockItem) => ({
        code: stockItem.code,
        disabled: stockItem.stock < minSelectableStock,
        name: stockItem.name,
        stock: stockItem.stock,
      })),
    [filteredStocks, minSelectableStock],
  );

  return (
    <AnimatedModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-xl"
      onAfterClose={onAfterClose}
    >
      <div className="flex items-center justify-between border-b border-linen-100 px-4 py-3">
        <div className="min-w-0 flex-1 pr-4">
          <h3 className="truncate text-sm font-semibold text-ink-900">Stock by Warehouse</h3>
          <p className="truncate text-xs text-neutral-500">
            {product ? `${product.code} - ${product.name}` : "-"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer rounded-full border border-linen-200 px-3 py-1 text-xs font-medium text-neutral-500 transition hover:bg-linen-100"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        <input
          className="mb-3 h-10 w-full rounded-xl border border-linen-200 bg-field-silver px-3 text-sm outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
          placeholder="Search warehouse code or name"
          value={warehouseSearch}
          onChange={(event) => {
            const { value } = event.target;
            setWarehouseSearch(value);
            // Sync back to the inline input (two-way sync with the parent lookup field)
            onSearchChange?.(value);
          }}
          autoComplete="off"
        />

        {loading && filteredStocks.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-linen-200 bg-surface">
            {SKELETON_ROW_KEYS.map((slot) => (
              <div
                key={`stock-skeleton-${slot}`}
                className="border-b border-linen-100 px-3 py-2 last:border-0"
              >
                <div className="h-8 w-full animate-pulse rounded-lg bg-linen-100" />
              </div>
            ))}
          </div>
        ) : error && filteredStocks.length === 0 ? (
          <LookupErrorState
            colSpan={1}
            message={error || "Unable to load stock details. Please try again."}
            {...(onRetry ? { onRetry } : {})}
          />
        ) : (
          <div className="mt-3">
            <SuggestionList
              items={suggestionItems}
              onSelect={(item) => {
                const matchedOrig = filteredStocks.find((s) => s.code === item.code);
                if (matchedOrig && onSelect && !item.disabled) {
                  onSelect(matchedOrig);
                }
              }}
              emptyText={
                warehouseSearch.trim()
                  ? `No warehouses match "${warehouseSearch.trim()}".`
                  : "No stock data available for this product."
              }
              showStock={true}
              floating={false}
              maxHeight="max-h-[300px]"
              query={warehouseSearch}
            />
          </div>
        )}
      </div>
    </AnimatedModalShell>
  );
}
