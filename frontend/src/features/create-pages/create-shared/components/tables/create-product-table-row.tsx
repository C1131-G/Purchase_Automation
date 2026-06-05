import { useQuery } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { ChevronDown, Search, Trash2 } from "lucide-react";
import React from "react";
import ReactDOM from "react-dom";

import { Tooltip } from "@/components/tooltip";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import { ProductWarehouseStockModal } from "@/features/create-pages/create-shared/components/modals/product-warehouse-stock-modal";
import { calculateLineTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type {
  CreateLookupOption,
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";

const RETURN_REASON_PRESETS = [
  "Item Damaged",
  "Changed mind",
  "Dissatisfaction with quality",
  "Ordered wrong item",
] as const;

interface ReturnReasonDropdownProps {
  value: string;
  disabled?: boolean;
  onSelect: (reason: string) => void;
}

function ReturnReasonDropdown({ value, disabled, onSelect }: ReturnReasonDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties | null>({
    position: "fixed",
    width: 220,
    zIndex: 9999,
  });

  const selectedLabel = value
    ? RETURN_REASON_PRESETS.includes(value as (typeof RETURN_REASON_PRESETS)[number])
      ? value
      : value
    : "";

  React.useEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      left: rect.left,
      position: "fixed",
      top: rect.bottom + 4,
      width: Math.max(rect.width, 220),
      zIndex: 9999,
    });
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsidePopup = popupRef.current?.contains(target);
      if (!isInsideTrigger && !isInsidePopup) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (reason: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onSelect(reason);
    setOpen(false);
  };

  return (
    <div ref={triggerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        onMouseDown={(e) => e.preventDefault()}
        className={`flex h-10 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 ${
          disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-zinc-300"
        } ${selectedLabel ? "text-zinc-700" : "text-zinc-400"} min-w-[140px]`}
      >
        <span className="truncate">{selectedLabel || "Select reason"}</span>
        <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
      </button>
      {open &&
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            style={dropdownStyle ?? undefined}
            className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-xl ring-1 ring-black/5"
          >
            {RETURN_REASON_PRESETS.map((reason) => (
              <button
                key={reason}
                type="button"
                onMouseDown={(e) => handleSelect(reason, e)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                <span>{reason}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

interface CreateProductTableRowProps {
  row: ProductRow;
  rowDraft?: ProductRowDraft | undefined;
  enforceStockLimit?: boolean;
  maxQuantity?: number | ((row: ProductRow) => number | undefined);
  linkedRow?: boolean | ((row: ProductRow) => boolean);
  openProductPopup: (rowId: string | null) => void;
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void;
  removeProductRow: (id: string) => void;
  setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => void;
  clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => void;
  prefetchProducts: () => void;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  disableInputs?: boolean;
  onInputRestrictedClick?: (() => void) | undefined;
  stockLimitReserve?: number;
  minStockToSelectWarehouse?: number;
  showExplicitZeroDiscount?: boolean;
  showSelection?: boolean;
  showReturnReason?: boolean;
  nativeReturnReason?: boolean;
  showTaxCode?: boolean;
  warehouseError?: string | undefined;
}

export function CreateProductTableRow({
  row,
  rowDraft,
  enforceStockLimit = true,
  openProductPopup,
  updateProductRow,
  removeProductRow,
  setProductRowDraft,
  clearProductRowDraft,
  prefetchProducts,
  warehouses,
  warehousesLoading,
  disableInputs = false,
  onInputRestrictedClick,
  stockLimitReserve = 0,
  minStockToSelectWarehouse = 0,
  showExplicitZeroDiscount = false,
  showSelection = false,
  showReturnReason = false,
  nativeReturnReason = false,
  showTaxCode = false,
  maxQuantity,
  linkedRow = false,
  warehouseError,
}: CreateProductTableRowProps) {
  const [warehouseInput, setWarehouseInput] = React.useState("");
  const [warehouseLookupInitialSearch, setWarehouseLookupInitialSearch] = React.useState("");
  const [warehouseFocused, setWarehouseFocused] = React.useState(false);
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const blurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const warehouseInputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties | null>(null);

  const effectiveMaxQuantity = React.useMemo(() => {
    if (typeof maxQuantity === "function") {
      return maxQuantity(row);
    }
    return maxQuantity;
  }, [maxQuantity, row]);

  const effectiveLinkedRow = React.useMemo(() => {
    if (typeof linkedRow === "function") {
      return linkedRow(row);
    }
    return linkedRow;
  }, [linkedRow, row]);

  const syncDropdownPosition = React.useCallback(() => {
    const rect = warehouseInputRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setDropdownStyle({
      left: rect.left,
      position: "fixed",
      top: rect.bottom + 4,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  // Continuously re-anchor the portal dropdown to the input element.
  // Using captures scroll listener so any scroll container (including overflow-x-auto table) triggers a re-sync.
  React.useLayoutEffect(() => {
    if (!warehouseFocused) {
      return;
    }
    syncDropdownPosition();
    window.addEventListener("scroll", syncDropdownPosition, true);
    window.addEventListener("resize", syncDropdownPosition);
    return () => {
      window.removeEventListener("scroll", syncDropdownPosition, true);
      window.removeEventListener("resize", syncDropdownPosition);
    };
  }, [warehouseFocused, syncDropdownPosition]);

  const stocksQuery = useQuery({
    ...createSharedQueries.productWarehouseStocks(row.productCode),
    enabled: Boolean(row.productCode),
  });
  const stocks = React.useMemo(() => stocksQuery.data ?? [], [stocksQuery.data]);

  // Sync warehouseInput with row.warehouseCode or matching warehouse name
  const committedWarehouseName = React.useMemo(() => {
    const matched = warehouses.find((w) => w.code === row.warehouseCode);
    if (!matched) return row.warehouseCode;
    return matched.name;
  }, [row.warehouseCode, warehouses]);

  React.useEffect(() => {
    // Keep inline display aligned with committed row value when selection changes externally.
    setWarehouseInput(committedWarehouseName);
  }, [committedWarehouseName]);

  // Cleanup blur timer on unmount
  React.useEffect(
    () => () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    },
    [],
  );

  const warehouseSuggestions = React.useMemo(() => {
    const term = warehouseInput.trim().toLowerCase();

    // Merge warehouse list with live stock data
    const withStock: CreateLookupOption[] = warehouses.map((w) => {
      const stockItem = Array.isArray(stocks)
        ? stocks.find((s: { code: string; stock?: number }) => s.code === w.code)
        : null;
      const stockQty = typeof stockItem?.stock === "number" ? stockItem.stock : undefined;
      return {
        ...w,
        disabled: stockQty !== undefined && stockQty < minStockToSelectWarehouse,
        stock: stockQty,
      };
    });

    // Filter by search term
    const filtered = term
      ? withStock.filter(
          (w) => w.name.toLowerCase().includes(term) || w.code.toLowerCase().includes(term),
        )
      : withStock;

    const score = (item: CreateLookupOption) => {
      if (!term) {
        return 3;
      }
      const code = item.code.toLowerCase();
      const name = item.name.toLowerCase();
      if (code === term || name === term) {
        return 0;
      }
      if (code.startsWith(term) || name.startsWith(term)) {
        return 1;
      }
      if (code.includes(term) || name.includes(term)) {
        return 2;
      }
      return 3;
    };

    // Buyer-style search ranking first, stock as secondary sort.
    return [...filtered].toSorted((a, b) => {
      const byScore = score(a) - score(b);
      if (byScore !== 0) {
        return byScore;
      }
      const aStock = a.stock ?? -1;
      const bStock = b.stock ?? -1;
      const byStock = bStock - aStock;
      if (byStock !== 0) {
        return byStock;
      }
      return a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [warehouses, stocks, warehouseInput, minStockToSelectWarehouse]);

  const handleWarehouseFocus = () => {
    if (disableInputs) {
      return;
    }
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
    syncDropdownPosition();
    setWarehouseFocused(true);
    // Do NOT clear the input on focus. Keep the current value so suggestions
    // filter by it immediately — matching the sales employee  pattern exactly.
  };

  const handleWarehouseBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setWarehouseFocused(false);
      setDropdownStyle(null);
    }, 150);
  };

  // --- Warehouse input: two-way sync matching the sales-employee lookup pattern ---

  const findWarehouseByName = (value: string) =>
    warehouses.find((w) => w.name.toLowerCase() === value.trim().toLowerCase());

  const findWarehouseByCode = (value: string) =>
    warehouses.find((w) => w.code.toLowerCase() === value.trim().toLowerCase());

  const selectWarehouseInRow = (item: CreateLookupOption) => {
    setWarehouseInput(item.name);
    setWarehouseFocused(false);
    handleSelectWarehouse(item);
  };

  const handleWarehouseChange = (value: string) => {
    setWarehouseInput(value);
    if (value.trim() === "") {
      setWarehouseFocused(true);
      if (row.warehouseCode || row.stock !== 0) {
        updateProductRow(row.id, { stock: 0, warehouseCode: "" });
      }
      return;
    }
    // Auto-commit on exact name or code match (same as sales employee)
    const matched = findWarehouseByName(value) ?? findWarehouseByCode(value);
    if (matched) {
      selectWarehouseInRow(matched);
      return;
    }
    // Keep draft typing visible but clear committed warehouse/stock to avoid stale badge/values.
    if (row.warehouseCode || row.stock !== 0) {
      updateProductRow(row.id, { stock: 0, warehouseCode: "" });
    }
    setWarehouseFocused(true);
  };
  const handleSelectWarehouse = (item: CreateLookupOption) => {
    setWarehouseInput(item.name);
    updateProductRow(row.id, { warehouseCode: item.code });
  };

  // Reactive stock synchronization:
  // When the warehouse code changes or the underlying stock data is refreshed,
  // update the row's stock value to keep the badge and validation in sync.
  React.useEffect(() => {
    if (!row.productCode || !row.warehouseCode || !stocksQuery.data) {
      return;
    }
    const matched = stocksQuery.data.find(
      (s: { code?: string; stock?: number }) =>
        String(s.code).trim() === String(row.warehouseCode).trim(),
    );
    const newStock = Number(matched?.stock ?? 0);
    if (row.stock !== newStock) {
      updateProductRow(row.id, { stock: newStock });
    }
  }, [stocksQuery.data, row.warehouseCode, row.productCode, row.id, row.stock, updateProductRow]);

  const maxAllowed = Math.max(0, Math.floor(row.stock) - stockLimitReserve);

  const quantityMessage =
    row.stock > 0 ? (
      <span className="flex items-center gap-1.5">
        <span className="font-normal text-zinc-600">Max allowed limit: </span>
        <span className="font-bold text-blue-600">{maxAllowed}</span>
      </span>
    ) : (
      <span className="font-bold text-rose-500">Item is out of stock</span>
    );

  // Use centralized line math for consistency with SAP totals
  const lineTotals = calculateLineTotals(row);
  const { gross: grossAmount, discount: clampedDiscountAmount, lineNet, lineTotal } = lineTotals;
  // Unit net price for display (pre-tax per unit)
  const unitNetPrice = (row.quantity || 0) > 0 ? lineNet / (row.quantity || 1) : 0;

  const discountPercentInputValue =
    rowDraft?.discountPercent ??
    (row.discountPercent === 0
      ? showExplicitZeroDiscount
        ? "0.00"
        : ""
      : row.discountPercent.toFixed(2));
  const discountAmountInputValue =
    rowDraft?.discountAmount ??
    (clampedDiscountAmount === 0
      ? showExplicitZeroDiscount
        ? "0.00"
        : ""
      : clampedDiscountAmount.toFixed(2));

  const isRowActive = !showSelection || row.selected === true;
  const effectiveDisableInputs = disableInputs || !isRowActive;

  return (
    <tr
      className={`transition-opacity duration-200 ${!isRowActive ? "opacity-50" : "opacity-100"}`}
    >
      {showSelection && (
        <td className="px-2 py-2 text-center">
          <input
            type="checkbox"
            checked={row.selected ?? false}
            disabled={disableInputs}
            onChange={(e) => updateProductRow(row.id, { selected: e.target.checked })}
            className={`h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 ${disableInputs ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          />
        </td>
      )}
      <td className="min-w-0 px-2 py-2">
        <div className="space-y-1">
          <Tooltip
            content={row.productName || "Select Product"}
            className="block w-full max-w-full"
          >
            <button
              type="button"
              disabled={disableInputs}
              onClick={() => {
                if (disableInputs) {
                  onInputRestrictedClick?.();
                  return;
                }
                openProductPopup(row.id);
              }}
              onMouseEnter={prefetchProducts}
              onFocus={prefetchProducts}
              className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-zinc-800 transition-all duration-150 ${
                effectiveDisableInputs
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer text-zinc-800 hover:bg-blue-50/50 hover:text-blue-700 active:bg-blue-100/60 active:text-blue-900"
              }`}
            >
              {row.productName || "Select Product"}
            </button>
          </Tooltip>
        </div>
      </td>
      <td className="relative min-w-0 px-2 py-2">
        <div className="relative">
          <input
            ref={warehouseInputRef}
            type="text"
            value={warehouseInput}
            readOnly={effectiveDisableInputs}
            onChange={(e) => handleWarehouseChange(e.target.value)}
            onFocus={handleWarehouseFocus}
            onBlur={handleWarehouseBlur}
            onClick={() => {
              if (effectiveDisableInputs) {
                onInputRestrictedClick?.();
              }
            }}
            disabled={warehousesLoading || effectiveDisableInputs}
            placeholder="Select Warehouse"
            className={`h-9 w-full rounded-lg border px-2 text-xs text-zinc-800 outline-none ${
              warehouseError
                ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200"
                : "border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            } ${
              disableInputs ? "cursor-not-allowed opacity-70" : "cursor-text"
            } ${row.warehouseCode ? "pr-[7.5rem]" : "pr-10"}`}
          />
          {row.warehouseCode && (
            <div className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="flex h-5 items-center justify-center rounded bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20 px-1.5 text-[10px] font-bold uppercase">
                {row.warehouseCode}
              </span>
              <span
                className={`flex h-5 items-center justify-center rounded px-1.5 text-[10px] font-bold ${
                  row.stock > 0
                    ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                    : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
                }`}
              >
                {row.stock}
              </span>
            </div>
          )}
          <button
            type="button"
            disabled={effectiveDisableInputs}
            onClick={() => {
              if (blurTimerRef.current) {
                clearTimeout(blurTimerRef.current);
              }
              const liveValue = warehouseInputRef.current?.value ?? warehouseInput;
              setWarehouseLookupInitialSearch(liveValue);
              setWarehouseFocused(false);
              setLookupOpen(true);
            }}
            className={`absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition ${
              effectiveDisableInputs
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer hover:bg-zinc-100"
            }`}
          >
            <Search className="h-3 w-3" />
          </button>
          {warehouseFocused &&
            dropdownStyle &&
            warehouseSuggestions.length > 0 &&
            ReactDOM.createPortal(
              <div style={dropdownStyle}>
                <SuggestionList
                  items={warehouseSuggestions}
                  onSelect={(item) => {
                    if (blurTimerRef.current) {
                      clearTimeout(blurTimerRef.current);
                    }
                    selectWarehouseInRow(item);
                  }}
                  containerClassName="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
                  showStock
                  showCode
                  query={warehouseInput}
                />
              </div>,
              document.body,
            )}
          {warehouseError && (
            <span className="absolute top-[calc(100%+1px)] left-1 text-[10px] font-semibold text-red-500 whitespace-nowrap pointer-events-none z-10">
              {warehouseError}
            </span>
          )}
        </div>

        <ProductWarehouseStockModal
          open={lookupOpen}
          product={{ code: row.productCode, name: row.productName }}
          stocks={stocks}
          loading={stocksQuery.isLoading}
          error={stocksQuery.isError ? "Unable to load stocks" : null}
          onClose={() => setLookupOpen(false)}
          minSelectableStock={minStockToSelectWarehouse}
          initialSearch={warehouseLookupInitialSearch}
          onSearchChange={(value) => {
            setWarehouseLookupInitialSearch(value);
            setWarehouseInput(value);
          }}
          onSelect={(item) => {
            handleSelectWarehouse(item);
            setLookupOpen(false);
          }}
        />
      </td>
      <td className="min-w-0 px-2 py-2">
        {enforceStockLimit ? (
          <Tooltip content={quantityMessage} className="block w-auto max-w-none">
            <input
              type="number"
              min={1}
              step={1}
              value={
                rowDraft?.quantity !== undefined ? rowDraft.quantity : String(row.quantity ?? 0)
              }
              readOnly={effectiveDisableInputs}
              onClick={() => {
                if (effectiveDisableInputs) {
                  onInputRestrictedClick?.();
                }
              }}
              onChange={(event) => {
                if (effectiveDisableInputs) {
                  return;
                }
                setProductRowDraft(row.id, "quantity", event.target.value);
              }}
              onBlur={(event) => {
                if (effectiveDisableInputs) {
                  return;
                }
                const rawValue = event.target.value.trim();

                if (rawValue === "") {
                  if (effectiveLinkedRow) {
                    goeyToast.error("0 not allowed", {
                      id: "min-quantity-error",
                    });
                    updateProductRow(row.id, { quantity: 1 });
                    clearProductRowDraft(row.id, "quantity");
                    return;
                  }
                  updateProductRow(row.id, { quantity: 0 });
                  clearProductRowDraft(row.id, "quantity");
                  return;
                }

                const typedQuantity = Number(rawValue);
                if (
                  effectiveLinkedRow &&
                  (typedQuantity === 0 || !Number.isFinite(typedQuantity))
                ) {
                  goeyToast.error("0 not allowed", {
                    id: "min-quantity-error",
                  });
                  updateProductRow(row.id, { quantity: 1 });
                  clearProductRowDraft(row.id, "quantity");
                  return;
                }

                const typedQuantityVal = Math.max(1, Number(rawValue) || 1);
                const clamped = Math.min(maxAllowed, typedQuantityVal);

                if (effectiveMaxQuantity !== undefined && clamped > effectiveMaxQuantity) {
                  goeyToast.error("Quantity cannot exceed base quantity", {
                    id: "max-quantity-error",
                  });
                  updateProductRow(row.id, { quantity: effectiveMaxQuantity });
                  clearProductRowDraft(row.id, "quantity");
                  return;
                }

                // Preserve existing discount percent and recompute discount amount based on new quantity
                const newGross = row.price * clamped;
                const newDiscountAmount =
                  Math.round(((newGross * row.discountPercent) / 100) * 100) / 100;
                updateProductRow(row.id, { quantity: clamped, discountAmount: newDiscountAmount });
                clearProductRowDraft(row.id, "quantity");
              }}
              className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-left text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${effectiveDisableInputs ? "cursor-not-allowed opacity-70" : ""}`}
            />
          </Tooltip>
        ) : (
          <input
            type="number"
            min={1}
            step={1}
            value={rowDraft?.quantity !== undefined ? rowDraft.quantity : String(row.quantity ?? 0)}
            readOnly={effectiveDisableInputs}
            onClick={() => {
              if (effectiveDisableInputs) {
                onInputRestrictedClick?.();
              }
            }}
            onChange={(event) => {
              if (effectiveDisableInputs) {
                return;
              }
              setProductRowDraft(row.id, "quantity", event.target.value);
            }}
            onBlur={(event) => {
              if (effectiveDisableInputs) {
                return;
              }
              const rawValue = event.target.value.trim();

              if (rawValue === "") {
                if (effectiveLinkedRow) {
                  goeyToast.error("0 not allowed", {
                    id: "min-quantity-error",
                  });
                  updateProductRow(row.id, { quantity: 1 });
                  clearProductRowDraft(row.id, "quantity");
                  return;
                }
                updateProductRow(row.id, { quantity: 0 });
                clearProductRowDraft(row.id, "quantity");
                return;
              }

              const typedQuantity = Number(rawValue);
              if (effectiveLinkedRow && (typedQuantity === 0 || !Number.isFinite(typedQuantity))) {
                goeyToast.error("0 not allowed", { id: "min-quantity-error" });
                updateProductRow(row.id, { quantity: 1 });
                clearProductRowDraft(row.id, "quantity");
                return;
              }

              const typedQuantityVal = Math.max(1, Number(rawValue) || 1);

              if (effectiveMaxQuantity !== undefined && typedQuantityVal > effectiveMaxQuantity) {
                goeyToast.error("Quantity cannot exceed base quantity", {
                  id: "max-quantity-error",
                });
                updateProductRow(row.id, { quantity: effectiveMaxQuantity });
                clearProductRowDraft(row.id, "quantity");
                return;
              }

              // Preserve discount percent and recalc discount amount
              const newGross = row.price * typedQuantityVal;
              const newDiscountAmount =
                Math.round(((newGross * row.discountPercent) / 100) * 100) / 100;
              updateProductRow(row.id, {
                quantity: typedQuantityVal,
                discountAmount: newDiscountAmount,
              });
            }}
            className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-left text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${effectiveDisableInputs ? "cursor-not-allowed opacity-70" : ""}`}
          />
        )}
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm text-zinc-700">
        {row.price.toFixed(2)}
      </td>
      <td className="min-w-0 px-2 py-2">
        <input
          type="number"
          step="0.001"
          inputMode="decimal"
          value={discountPercentInputValue}
          readOnly={effectiveDisableInputs}
          onClick={() => {
            if (effectiveDisableInputs) {
              onInputRestrictedClick?.();
            }
          }}
          onChange={(event) => {
            if (effectiveDisableInputs) {
              return;
            }
            const rawValue = event.target.value;
            setProductRowDraft(row.id, "discountPercent", rawValue);

            const trimmedValue = rawValue.trim();
            if (trimmedValue === "") {
              updateProductRow(row.id, {
                discountAmount: 0,
                discountPercent: 0,
              });
              return;
            }

            const rawPercent = Math.round((Number(trimmedValue) || 0) * 1000) / 1000;
            const nextPercent = Math.min(100, rawPercent);
            const nextAmount = Math.round(((grossAmount * nextPercent) / 100) * 100) / 100;
            updateProductRow(row.id, {
              discountAmount: nextAmount,
              discountPercent: nextPercent,
            });
          }}
          onBlur={(event) => {
            if (effectiveDisableInputs) {
              return;
            }
            const rawValue = event.target.value.trim();
            const rawPercent =
              rawValue === "" ? 0 : Math.round((Number(rawValue) || 0) * 1000) / 1000;
            const nextPercent = Math.min(100, rawPercent);
            const nextAmount = Math.round(((grossAmount * nextPercent) / 100) * 100) / 100;
            updateProductRow(row.id, {
              discountAmount: nextAmount,
              discountPercent: nextPercent,
            });
            clearProductRowDraft(row.id, "discountPercent");
          }}
          className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${effectiveDisableInputs ? "cursor-not-allowed opacity-70" : ""}`}
        />
      </td>
      <td className="min-w-0 px-2 py-2">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          title=""
          value={discountAmountInputValue}
          readOnly={effectiveDisableInputs}
          onClick={() => {
            if (effectiveDisableInputs) {
              onInputRestrictedClick?.();
            }
          }}
          onChange={(event) => {
            if (effectiveDisableInputs) {
              return;
            }
            const rawValue = event.target.value;
            setProductRowDraft(row.id, "discountAmount", rawValue);

            const trimmedValue = rawValue.trim();
            if (trimmedValue === "") {
              updateProductRow(row.id, {
                discountAmount: 0,
                discountPercent: 0,
              });
              return;
            }

            const rawAmount = Math.round((Number(trimmedValue) || 0) * 100) / 100;
            const nextAmount = Math.min(grossAmount, rawAmount);
            const nextPercent =
              grossAmount > 0 ? Math.ceil((nextAmount / grossAmount) * 100 * 1000000) / 1000000 : 0;
            updateProductRow(row.id, {
              discountAmount: nextAmount,
              discountPercent: nextPercent,
            });
          }}
          onBlur={(event) => {
            if (effectiveDisableInputs) {
              return;
            }
            const rawValue = event.target.value.trim();
            const rawAmount = rawValue === "" ? 0 : Math.round((Number(rawValue) || 0) * 100) / 100;
            const nextAmount = Math.min(grossAmount, rawAmount);
            const nextPercent =
              grossAmount > 0 ? Math.ceil((nextAmount / grossAmount) * 100 * 1000000) / 1000000 : 0;
            updateProductRow(row.id, {
              discountAmount: nextAmount,
              discountPercent: nextPercent,
            });
            clearProductRowDraft(row.id, "discountAmount");
          }}
          className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${effectiveDisableInputs ? "cursor-not-allowed opacity-70" : ""}`}
        />
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm text-zinc-700">
        {unitNetPrice.toFixed(2)}
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm font-medium text-zinc-900">
        {lineTotal.toFixed(2)}
      </td>
      {showTaxCode && (
        <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm text-zinc-700">
          {row.vatGroup || "-"}
        </td>
      )}
      {showReturnReason && (
        <td className="min-w-0 px-2 py-2">
          {nativeReturnReason ? (
            <select
              value={row.returnReason ?? ""}
              disabled={effectiveDisableInputs}
              onChange={(e) => {
                updateProductRow(row.id, { returnReason: e.target.value });
              }}
              className={`h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 ${
                effectiveDisableInputs
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:border-zinc-300"
              } ${row.returnReason ? "text-zinc-700" : "text-zinc-400"}`}
            >
              <option value="">Select reason</option>
              {RETURN_REASON_PRESETS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          ) : (
            <ReturnReasonDropdown
              value={row.returnReason ?? ""}
              disabled={effectiveDisableInputs}
              onSelect={(reason) => {
                updateProductRow(row.id, { returnReason: reason });
              }}
            />
          )}
        </td>
      )}
      <td className="min-w-0 px-2 py-2 text-right">
        <Tooltip content="Remove row" className="block w-auto max-w-none">
          <button
            type="button"
            disabled={effectiveDisableInputs}
            onClick={() => {
              if (effectiveDisableInputs) {
                onInputRestrictedClick?.();
                return;
              }
              removeProductRow(row.id);
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition ${
              effectiveDisableInputs
                ? "cursor-not-allowed bg-zinc-50 opacity-40"
                : "cursor-pointer bg-white hover:bg-zinc-50 hover:text-blue-600"
            }`}
            aria-label="Remove product row"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </td>
    </tr>
  );
}
