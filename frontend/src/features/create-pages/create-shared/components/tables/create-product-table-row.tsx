import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ChevronDown, Search, Trash2 } from "lucide-react";
import React, { type ComponentProps, type ReactElement } from "react";
import ReactDOM from "react-dom";

import { Calendar } from "@/components/calendar/calendar";
import { LookupPopup } from "@/components/lookup/lookup-popup";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";

import { Tooltip } from "@/components/tooltip";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import { ProductUomModal } from "@/features/create-pages/create-shared/components/modals/product-uom-modal";
import { ProductWarehouseStockModal } from "@/features/create-pages/create-shared/components/modals/product-warehouse-stock-modal";
import { calculateLineTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type {
  CreateLookupOption,
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";

type CalendarWithBoundsProps = ComponentProps<typeof Calendar> & {
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
};
const CalendarWithBounds = Calendar as unknown as (props: CalendarWithBoundsProps) => ReactElement;

const RETURN_REASON_PRESETS = [
  "Item Damaged",
  "Changed mind",
  "Dissatisfaction with quality",
  "Ordered wrong item",
] as const;

interface FixedDropdownProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  visible: boolean;
}

function FixedDropdown({ anchorRef, children, visible }: FixedDropdownProps) {
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    if (!visible || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 260),
      zIndex: 9999,
    });
  }, [visible, anchorRef]);

  if (!visible) return null;

  return ReactDOM.createPortal(<div style={style}>{children}</div>, document.body);
}

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
        className={`flex h-10 w-full items-center justify-between rounded-xl border border-linen-200 bg-surface px-3 text-xs font-medium outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-200 ${
          disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-linen-200"
        } ${selectedLabel ? "text-ink-900" : "text-neutral-400"} min-w-[140px]`}
      >
        <span className="truncate">{selectedLabel || "Select reason"}</span>
        <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
      </button>
      {open &&
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            style={dropdownStyle ?? undefined}
            className="overflow-hidden rounded-xl border border-linen-100 bg-surface shadow-xl ring-1 ring-ink-900/5"
          >
            {RETURN_REASON_PRESETS.map((reason) => (
              <button
                key={reason}
                type="button"
                onMouseDown={(e) => handleSelect(reason, e)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-ink-900 transition hover:bg-linen-50"
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
  prefetchProducts: (warehouseCode?: string) => void;
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
  warehouseError?: string | undefined;
  showUom?: boolean;
  uoms?: CreateLookupOption[];
  showBinLocation?: boolean;
  showGLAccount?: boolean;
  /** PQ only: Required Date, Quoted Date, Required Qty, Quoted Qty after UoM. */
  showPqLineDatesAndQtys?: boolean;
  /**
   * RFQ seller fill: PQ column layout, only quoted qty/date + price + disc editable.
   * Buyer snapshot fields (product, WH, UoM, required date/qty) stay locked.
   */
  rfqSellerFill?: boolean;
  /** RFQ submit: highlight missing quoted qty / date / price (vendor-style red border). */
  lineFieldInvalid?: { price?: boolean; quantity?: boolean; quotedDate?: boolean } | undefined;
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
  maxQuantity,
  linkedRow = false,
  warehouseError,
  showUom = false,
  uoms = [],
  showBinLocation = false,
  showGLAccount = false,
  showPqLineDatesAndQtys = false,
  rfqSellerFill = false,
  lineFieldInvalid,
}: CreateProductTableRowProps) {
  const invalidFieldClass =
    "border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200";
  const normalFieldClass =
    "border-linen-200 bg-linen-50 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200";
  const normalTransparentFieldClass =
    "border-transparent bg-linen-50 hover:border-linen-200 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200";
  const [warehouseInput, setWarehouseInput] = React.useState("");
  const [warehouseLookupInitialSearch, setWarehouseLookupInitialSearch] = React.useState("");
  const [warehouseFocused, setWarehouseFocused] = React.useState(false);

  // G/L Account state
  const [accountInput, setAccountInput] = React.useState("");
  const [accountFocused, setAccountFocused] = React.useState(false);
  const [accountLookupOpen, setAccountLookupOpen] = React.useState(false);
  const accountInputRef = React.useRef<HTMLInputElement>(null);

  // Bin Location state
  const [binInput, setBinInput] = React.useState("");
  const [binFocused, setBinFocused] = React.useState(false);
  const [binLookupOpen, setBinLookupOpen] = React.useState(false);
  const binInputRef = React.useRef<HTMLInputElement>(null);

  const productUoms = React.useMemo(() => {
    const getUomName = (code: string) => uoms.find((u) => u.code === code)?.name || code;

    // If the row carries a full item-specific UoM list (from its SAP UoM Group),
    // use that list directly so the dropdown shows all valid UoMs for the product.
    if (row.uomList && row.uomList.length > 0) {
      return row.uomList.map((u) => ({
        code: u.code,
        name: u.name || getUomName(u.code),
        uomEntry: u.uomEntry,
      })) as CreateLookupOption[];
    }

    // Legacy fallback: build from purchase/sales/current UoM fields (other modules).
    const list: CreateLookupOption[] = [];
    if (row.purchaseUomCode) {
      list.push({
        code: row.purchaseUomCode,
        name: getUomName(row.purchaseUomCode),
        uomEntry: row.purchaseUomEntry,
      });
    }
    if (row.salesUomCode && row.salesUomCode !== row.purchaseUomCode) {
      list.push({
        code: row.salesUomCode,
        name: getUomName(row.salesUomCode),
        uomEntry: row.salesUomEntry,
      });
    }
    if (row.uomCode && !list.some((u) => u.code === row.uomCode)) {
      list.push({
        code: row.uomCode,
        name: getUomName(row.uomCode),
        uomEntry: row.uomEntry,
      });
    }
    return list;
  }, [
    row.uomList,
    row.purchaseUomCode,
    row.purchaseUomEntry,
    row.salesUomCode,
    row.salesUomEntry,
    row.uomCode,
    row.uomEntry,
    uoms,
  ]);
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const blurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const warehouseInputRef = React.useRef<HTMLInputElement>(null);
  const isEditingRef = React.useRef(false);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties | null>(null);

  const [uomInput, setUomInput] = React.useState("");
  const [uomLookupOpen, setUomLookupOpen] = React.useState(false);
  const [uomLookupInitialSearch, setUomLookupInitialSearch] = React.useState("");

  /** PQ/RFQ line date pickers — portaled to document.body so table overflow never clips them. */
  const [lineDatePicker, setLineDatePicker] = React.useState<"required" | "quoted" | null>(null);
  const requiredDateCellRef = React.useRef<HTMLDivElement>(null);
  const quotedDateCellRef = React.useRef<HTMLDivElement>(null);
  const lineCalendarPortalRef = React.useRef<HTMLDivElement>(null);
  const [lineCalendarStyle, setLineCalendarStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    zIndex: 999_999,
  });
  const today = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const updateLineCalendarPosition = React.useCallback(() => {
    const anchor =
      lineDatePicker === "required"
        ? requiredDateCellRef.current
        : lineDatePicker === "quoted"
          ? quotedDateCellRef.current
          : null;
    if (!anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    // Prefer measured portal size after paint so the full calendar (6 weeks) fits.
    const measured = lineCalendarPortalRef.current?.getBoundingClientRect();
    const calendarHeight = measured && measured.height > 0 ? measured.height : 380;
    const calendarWidth = measured && measured.width > 0 ? measured.width : 288;
    const margin = 8;
    // Product-row dates always open upward so the table/footer never covers days.
    let top = rect.top - calendarHeight - margin;
    const maxTop = Math.max(margin, window.innerHeight - calendarHeight - margin);
    if (top < margin) {
      top = margin;
    }
    if (top > maxTop) {
      top = maxTop;
    }
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - calendarWidth - margin));
    setLineCalendarStyle({
      position: "fixed",
      top,
      left,
      zIndex: 999_999,
    });
  }, [lineDatePicker]);

  React.useLayoutEffect(() => {
    if (lineDatePicker !== "required" && lineDatePicker !== "quoted") {
      return;
    }
    updateLineCalendarPosition();
    // Second pass after portal paint for accurate height (avoids clipping last week).
    const frameId = window.requestAnimationFrame(() => {
      updateLineCalendarPosition();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [lineDatePicker, row.requiredDate, row.quotedDate, updateLineCalendarPosition]);

  React.useEffect(() => {
    if (lineDatePicker !== "required" && lineDatePicker !== "quoted") {
      return;
    }
    // Reposition on scroll (do not close — overflow containers fire scroll often).
    const handleScrollOrResize = () => updateLineCalendarPosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideRequired = requiredDateCellRef.current?.contains(target);
      const insideQuoted = quotedDateCellRef.current?.contains(target);
      const insidePortal = lineCalendarPortalRef.current?.contains(target);
      if (!insideRequired && !insideQuoted && !insidePortal) {
        setLineDatePicker(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLineDatePicker(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [lineDatePicker, updateLineCalendarPosition]);

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
    if (isEditingRef.current) {
      return;
    }
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
      isEditingRef.current = false;
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
    isEditingRef.current = false;
    setWarehouseInput(item.name);
    setWarehouseFocused(false);
    handleSelectWarehouse(item);
  };

  const handleWarehouseChange = (value: string) => {
    isEditingRef.current = true;
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
        <span className="font-normal text-neutral-500">Max allowed limit: </span>
        <span className="font-bold text-teal-600">{maxAllowed}</span>
      </span>
    ) : (
      <span className="font-bold text-rose-500">Item is out of stock</span>
    );

  React.useEffect(() => {
    setUomInput(row.uomCode ?? "");
  }, [row.uomCode]);

  const selectedWarehouse = React.useMemo(() => {
    return warehouses.find((w) => w.code === row.warehouseCode);
  }, [warehouses, row.warehouseCode]);
  const enableBinLocations = (selectedWarehouse as any)?.enableBinLocations === true;

  const binsQuery = useQuery({
    ...createSharedQueries.warehouseBins(row.warehouseCode || ""),
    enabled: enableBinLocations && Boolean(row.warehouseCode) && (binFocused || binLookupOpen),
  });
  const binSuggestions = React.useMemo(() => binsQuery.data ?? [], [binsQuery.data]);

  React.useEffect(() => {
    setBinInput(row.binLocationAllocation ? String(row.binLocationAllocation) : "");
  }, [row.binLocationAllocation]);

  const accountQuery = useQuery({
    ...outgoingPaymentQueries.accountSuggestions(accountInput || undefined, 100),
    enabled: accountFocused || accountLookupOpen,
  });
  const accountSuggestions = React.useMemo(() => {
    return (accountQuery.data?.data ?? []).map((acc) => ({
      code: acc.GLAccount,
      name: acc.Account,
    }));
  }, [accountQuery.data]);

  React.useEffect(() => {
    setAccountInput(row.accountCode ?? "");
  }, [row.accountCode]);

  const selectUomInRow = (item: CreateLookupOption) => {
    setUomInput(item.code);
    updateProductRow(row.id, {
      uomCode: item.code,
      uomEntry: item.uomEntry,
    });
  };

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
  const baseDisabled = disableInputs || !isRowActive;
  /**
   * RFQ seller fill locks product/WH/UoM/required (and remove) via effectiveDisableInputs.
   * Quoted qty/date, price, and discounts use sellerFieldEditable instead.
   */
  const effectiveDisableInputs = baseDisabled || rfqSellerFill;
  const snapshotLocked = effectiveDisableInputs;
  const sellerFieldEditable = rfqSellerFill && !baseDisabled;
  const sellerFieldLocked = !sellerFieldEditable;

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
            className={`h-4 w-4 rounded border-linen-200 text-teal-600 focus:ring-teal-500 ${disableInputs ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
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
              disabled={snapshotLocked}
              onClick={() => {
                if (snapshotLocked) {
                  onInputRestrictedClick?.();
                  return;
                }
                openProductPopup(row.id);
              }}
              onMouseEnter={() => prefetchProducts(row.warehouseCode)}
              onFocus={() => prefetchProducts(row.warehouseCode)}
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink-900 transition-all duration-150 ${
                snapshotLocked
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer text-ink-900 hover:bg-teal-50/50 hover:text-teal-700 active:bg-teal-100/60 active:text-teal-900"
              }`}
            >
              <span className="block truncate">
                {rfqSellerFill
                  ? row.productName || row.productCode || "—"
                  : row.productName || "Select Product"}
              </span>
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
            className={`h-9 w-full rounded-lg border px-2 pr-10 text-xs text-ink-900 outline-none ${
              warehouseError
                ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
                : "border-linen-200 bg-linen-50 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
            } ${disableInputs ? "cursor-not-allowed opacity-70" : "cursor-text"}`}
          />
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
            className={`absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition ${
              effectiveDisableInputs
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer hover:bg-linen-100"
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
                  containerClassName="overflow-hidden rounded-2xl border border-linen-200 bg-surface shadow-xl"
                  showStock
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
      {showBinLocation && (
        <td className="relative px-2 py-2 min-w-0">
          {enableBinLocations ? (
            <>
              <div className="relative">
                <input
                  ref={binInputRef}
                  type="text"
                  value={binInput}
                  disabled={effectiveDisableInputs}
                  onChange={(e) => {
                    setBinInput(e.target.value);
                    setBinFocused(true);
                  }}
                  onFocus={() => setBinFocused(true)}
                  onBlur={() => {
                    blurTimerRef.current = setTimeout(() => setBinFocused(false), 150);
                  }}
                  placeholder="Select Bin"
                  className="h-9 w-full rounded-lg border border-linen-200 bg-linen-50 px-2 pr-8 text-xs text-ink-900 outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 cursor-pointer"
                />
                <button
                  type="button"
                  disabled={effectiveDisableInputs}
                  onClick={() => setBinLookupOpen(true)}
                  className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:bg-linen-100 hover:text-neutral-500 transition"
                >
                  <Search className="h-3 w-3" />
                </button>
                <FixedDropdown
                  anchorRef={binInputRef}
                  visible={binFocused && binSuggestions.length > 0}
                >
                  <SuggestionList
                    items={binSuggestions.filter(
                      (b) =>
                        b.code.toLowerCase().includes(binInput.toLowerCase()) ||
                        b.name.toLowerCase().includes(binInput.toLowerCase()),
                    )}
                    onSelect={(item) => {
                      setBinInput(item.code);
                      updateProductRow(row.id, { binLocationAllocation: Number(item.code) });
                      setBinFocused(false);
                    }}
                    query={binInput}
                  />
                </FixedDropdown>
              </div>
              <LookupPopup
                open={binLookupOpen}
                mode="warehouse"
                search={binInput}
                results={binSuggestions}
                loading={binsQuery.isLoading}
                error={binsQuery.isError ? (binsQuery.error as Error).message : null}
                title="Search Bin Locations"
                searchPlaceholder="Search bin code or name..."
                onSearchChange={(val) => {
                  setBinInput(val);
                  setBinFocused(true);
                }}
                onClose={() => setBinLookupOpen(false)}
                onSelect={(item) => {
                  setBinInput(item.code);
                  updateProductRow(row.id, { binLocationAllocation: Number(item.code) });
                  setBinLookupOpen(false);
                }}
              />
            </>
          ) : (
            <input
              type="text"
              value=""
              disabled={true}
              className="h-9 w-full rounded-lg border border-transparent bg-linen-100 px-2 text-xs text-neutral-400 outline-none cursor-not-allowed"
              placeholder="N/A"
            />
          )}
        </td>
      )}
      {showUom && (
        <td className="relative min-w-0 px-2 py-2">
          <div className="relative w-full">
            <input
              type="text"
              value={uomInput}
              readOnly={true}
              onClick={() => {
                if (effectiveDisableInputs) {
                  onInputRestrictedClick?.();
                  return;
                }
                setUomLookupInitialSearch("");
                setUomLookupOpen(true);
              }}
              disabled={effectiveDisableInputs}
              placeholder="UoM"
              className={`h-9 w-full rounded-lg border pl-2.5 pr-8 text-xs text-ink-900 outline-none cursor-pointer ${
                row.uomCode ? "border-linen-200 bg-linen-50" : "border-red-300 bg-rose-50/50"
              } focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 transition-all duration-150 ${
                disableInputs ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            />
            <button
              type="button"
              disabled={effectiveDisableInputs}
              onClick={() => {
                if (effectiveDisableInputs) {
                  return;
                }
                setUomLookupInitialSearch("");
                setUomLookupOpen(true);
              }}
              className={`absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition ${
                effectiveDisableInputs
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:bg-linen-100"
              }`}
            >
              <Search className="h-3 w-3" />
            </button>
          </div>
          <ProductUomModal
            open={uomLookupOpen}
            product={{ code: row.productCode, name: row.productName }}
            uoms={productUoms}
            onClose={() => setUomLookupOpen(false)}
            initialSearch={uomLookupInitialSearch}
            onSearchChange={setUomLookupInitialSearch}
            onSelect={(item) => {
              selectUomInRow(item);
              setUomLookupOpen(false);
            }}
          />
        </td>
      )}
      {showPqLineDatesAndQtys ? (
        <>
          {/* Required Date — editable on PQ buyer; locked on RFQ seller fill. */}
          <td className="relative min-w-0 px-2 py-2">
            <div ref={requiredDateCellRef} className="relative">
              <button
                type="button"
                disabled={snapshotLocked}
                onClick={() => {
                  if (snapshotLocked) {
                    onInputRestrictedClick?.();
                    return;
                  }
                  setLineDatePicker((prev) => (prev === "required" ? null : "required"));
                }}
                className={`relative flex h-9 w-full items-center justify-start rounded-lg border pl-2 pr-8 text-left text-xs outline-none transition ${
                  snapshotLocked
                    ? "cursor-not-allowed border-linen-200 bg-linen-100 text-neutral-500 opacity-70"
                    : "cursor-pointer border-linen-200 bg-linen-50 text-ink-900 hover:bg-surface focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                }`}
              >
                <span className={row.requiredDate ? "text-ink-900" : "text-neutral-400"}>
                  {row.requiredDate ? toDisplayDate(row.requiredDate) : "Select date"}
                </span>
                <span
                  className={`absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 ${
                    snapshotLocked ? "opacity-50" : ""
                  }`}
                >
                  <CalendarIcon className="h-3 w-3" aria-hidden />
                </span>
              </button>
              {lineDatePicker === "required" && !snapshotLocked && typeof document !== "undefined"
                ? ReactDOM.createPortal(
                    <div
                      ref={lineCalendarPortalRef}
                      style={lineCalendarStyle}
                      className="rounded-2xl border border-linen-200 bg-surface p-1 shadow-2xl ring-1 ring-ink-900/5"
                      onMouseDown={(event) => {
                        // Keep focus/click inside portal from bubbling to table handlers.
                        event.stopPropagation();
                      }}
                    >
                      <CalendarWithBounds
                        mode="single"
                        minDate={today}
                        {...(row.requiredDate ? { selected: parseISODate(row.requiredDate) } : {})}
                        onSelect={(value) => {
                          if (!(value instanceof Date)) {
                            return;
                          }
                          updateProductRow(row.id, { requiredDate: toISODate(value) });
                          setLineDatePicker(null);
                        }}
                      />
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          </td>
          {/* Quoted Date — locked on PQ; editable on RFQ seller fill. */}
          <td className="relative min-w-0 px-2 py-2">
            <div ref={quotedDateCellRef} className="relative">
              {sellerFieldEditable ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setLineDatePicker((prev) => (prev === "quoted" ? null : "quoted"));
                    }}
                    aria-invalid={lineFieldInvalid?.quotedDate === true}
                    className={`relative flex h-9 w-full cursor-pointer items-center justify-start rounded-lg border pl-2 pr-8 text-left text-xs text-ink-900 outline-none transition hover:bg-surface ${
                      lineFieldInvalid?.quotedDate ? invalidFieldClass : normalFieldClass
                    }`}
                  >
                    <span className={row.quotedDate ? "text-ink-900" : "text-neutral-400"}>
                      {row.quotedDate ? toDisplayDate(row.quotedDate) : "Select date"}
                    </span>
                    <span className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500">
                      <CalendarIcon className="h-3 w-3" aria-hidden />
                    </span>
                  </button>
                  {lineDatePicker === "quoted" && typeof document !== "undefined"
                    ? ReactDOM.createPortal(
                        <div
                          ref={lineCalendarPortalRef}
                          style={lineCalendarStyle}
                          className="rounded-2xl border border-linen-200 bg-surface p-1 shadow-2xl ring-1 ring-ink-900/5"
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <CalendarWithBounds
                            mode="single"
                            {...(row.quotedDate ? { selected: parseISODate(row.quotedDate) } : {})}
                            onSelect={(value) => {
                              if (!(value instanceof Date)) {
                                return;
                              }
                              updateProductRow(row.id, { quotedDate: toISODate(value) });
                              setLineDatePicker(null);
                            }}
                          />
                        </div>,
                        document.body,
                      )
                    : null}
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  tabIndex={-1}
                  title={
                    rfqSellerFill
                      ? "Quoted date is read-only for this status"
                      : "Quoted date is not editable"
                  }
                  className="relative flex h-9 w-full cursor-not-allowed items-center justify-start rounded-lg border border-linen-200 bg-linen-100 pl-2 pr-8 text-left text-xs text-neutral-500 outline-none opacity-80"
                >
                  <span className={row.quotedDate ? "text-neutral-500" : "text-neutral-400"}>
                    {row.quotedDate ? toDisplayDate(row.quotedDate) : "Select date"}
                  </span>
                  <span className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-400 opacity-60">
                    <CalendarIcon className="h-3 w-3" aria-hidden />
                  </span>
                </button>
              )}
            </div>
          </td>
          <td className="min-w-0 px-2 py-2">
            <input
              type="number"
              min={0}
              step={1}
              value={
                rowDraft?.requiredQuantity !== undefined
                  ? rowDraft.requiredQuantity
                  : String(row.requiredQuantity ?? 0)
              }
              readOnly={snapshotLocked}
              onClick={() => {
                if (snapshotLocked) {
                  onInputRestrictedClick?.();
                }
              }}
              onChange={(event) => {
                if (snapshotLocked) {
                  return;
                }
                setProductRowDraft(row.id, "requiredQuantity", event.target.value);
              }}
              onBlur={(event) => {
                if (snapshotLocked) {
                  return;
                }
                const rawValue = event.target.value.trim();
                const next = rawValue === "" ? 0 : Math.max(0, Math.trunc(Number(rawValue) || 0));
                updateProductRow(row.id, { requiredQuantity: next });
                clearProductRowDraft(row.id, "requiredQuantity");
              }}
              className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-linen-50 px-2 text-left text-xs text-ink-900 outline-none transition hover:border-linen-200 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 ${snapshotLocked ? "cursor-not-allowed opacity-70" : ""}`}
            />
          </td>
          {/* Quoted Qty — locked on PQ; editable on RFQ seller fill. */}
          <td className="min-w-0 px-2 py-2">
            {sellerFieldEditable ? (
              <input
                type="number"
                min={0}
                step="any"
                placeholder="0"
                aria-invalid={lineFieldInvalid?.quantity === true}
                value={
                  rowDraft?.quantity !== undefined
                    ? rowDraft.quantity
                    : row.quantity > 0
                      ? String(row.quantity)
                      : ""
                }
                onChange={(event) => {
                  setProductRowDraft(row.id, "quantity", event.target.value);
                }}
                onBlur={(event) => {
                  const rawValue = event.target.value.trim();
                  const next = rawValue === "" ? 0 : Math.max(0, Number(rawValue) || 0);
                  const newGross = row.price * next;
                  const newDiscountAmount =
                    Math.round(((newGross * row.discountPercent) / 100) * 100) / 100;
                  updateProductRow(row.id, {
                    discountAmount: newDiscountAmount,
                    quantity: next,
                  });
                  clearProductRowDraft(row.id, "quantity");
                }}
                className={`h-9 w-full min-w-0 rounded-lg border px-2 text-left text-xs text-ink-900 outline-none transition ${
                  lineFieldInvalid?.quantity ? invalidFieldClass : normalTransparentFieldClass
                }`}
              />
            ) : (
              <input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={row.quantity > 0 ? String(row.quantity) : ""}
                disabled
                readOnly
                tabIndex={-1}
                aria-readonly="true"
                title={
                  rfqSellerFill
                    ? "Quoted quantity is read-only for this status"
                    : "Quoted quantity is not editable"
                }
                className="h-9 w-full min-w-0 cursor-not-allowed rounded-lg border border-linen-200 bg-linen-100 px-2 text-left text-xs text-neutral-500 outline-none opacity-80 placeholder:text-neutral-400"
              />
            )}
          </td>
        </>
      ) : (
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
                    updateProductRow(row.id, { quantity: 1 });
                    clearProductRowDraft(row.id, "quantity");
                    return;
                  }

                  const typedQuantityVal = Math.max(1, Number(rawValue) || 1);
                  const clamped = row.warehouseCode
                    ? Math.min(maxAllowed, typedQuantityVal)
                    : typedQuantityVal;

                  if (effectiveMaxQuantity !== undefined && clamped > effectiveMaxQuantity) {
                    updateProductRow(row.id, { quantity: effectiveMaxQuantity });
                    clearProductRowDraft(row.id, "quantity");
                    return;
                  }

                  // Preserve existing discount percent and recompute discount amount based on new quantity
                  const newGross = row.price * clamped;
                  const newDiscountAmount =
                    Math.round(((newGross * row.discountPercent) / 100) * 100) / 100;
                  updateProductRow(row.id, {
                    quantity: clamped,
                    discountAmount: newDiscountAmount,
                  });
                  clearProductRowDraft(row.id, "quantity");
                }}
                className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-linen-50 px-2 text-left text-xs text-ink-900 outline-none transition hover:border-linen-200 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 ${effectiveDisableInputs ? "cursor-not-allowed opacity-70" : ""}`}
              />
            </Tooltip>
          ) : (
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
                  updateProductRow(row.id, { quantity: 1 });
                  clearProductRowDraft(row.id, "quantity");
                  return;
                }

                const typedQuantityVal = Math.max(1, Number(rawValue) || 1);

                if (effectiveMaxQuantity !== undefined && typedQuantityVal > effectiveMaxQuantity) {
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
              className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-linen-50 px-2 text-left text-xs text-ink-900 outline-none transition hover:border-linen-200 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 ${effectiveDisableInputs ? "cursor-not-allowed opacity-70" : ""}`}
            />
          )}
        </td>
      )}
      <td className="min-w-0 px-2 py-2">
        {showPqLineDatesAndQtys && !sellerFieldEditable ? (
          // PQ buyer / RFQ read-only: price locked.
          <input
            type="text"
            inputMode="decimal"
            value={Number(row.price || 0).toFixed(2)}
            disabled
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            title="Price is not editable"
            className="h-9 w-full min-w-0 cursor-not-allowed rounded-lg border border-linen-200 bg-linen-100 px-2 text-left text-xs text-neutral-500 outline-none opacity-80"
          />
        ) : showPqLineDatesAndQtys && sellerFieldEditable ? (
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0"
            aria-invalid={lineFieldInvalid?.price === true}
            value={
              // Draft string while typing (so "0" is removable); otherwise show 0, not blank.
              rowDraft?.price !== undefined ? rowDraft.price : String(row.price ?? 0)
            }
            onChange={(event) => {
              // Keep draft string so user can clear "0" and type a new price.
              setProductRowDraft(row.id, "price", event.target.value);
            }}
            onBlur={(event) => {
              const rawValue = event.target.value.trim();
              if (rawValue === "") {
                updateProductRow(row.id, {
                  discountAmount: 0,
                  price: 0,
                });
                clearProductRowDraft(row.id, "price");
                return;
              }
              const parsed = Number(rawValue);
              const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
              const newGross = next * row.quantity;
              const newDiscountAmount =
                Math.round(((newGross * row.discountPercent) / 100) * 100) / 100;
              updateProductRow(row.id, {
                discountAmount: newDiscountAmount,
                price: next,
              });
              clearProductRowDraft(row.id, "price");
            }}
            className={`h-9 w-full min-w-0 rounded-lg border px-2 text-left text-xs text-ink-900 outline-none transition ${
              lineFieldInvalid?.price ? invalidFieldClass : normalTransparentFieldClass
            }`}
          />
        ) : (
          <span className="whitespace-nowrap text-left text-sm text-ink-900">
            {Number(row.price).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </span>
        )}
      </td>
      <td className="min-w-0 px-2 py-2">
        {showPqLineDatesAndQtys && !sellerFieldEditable ? (
          <input
            type="text"
            inputMode="decimal"
            value={Number(row.discountPercent || 0).toFixed(2)}
            disabled
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            title="Discount % is not editable"
            className="h-9 w-full min-w-0 cursor-not-allowed rounded-lg border border-linen-200 bg-linen-100 px-2 text-left text-xs text-neutral-500 outline-none opacity-80"
          />
        ) : (
          <input
            type="number"
            step="0.001"
            inputMode="decimal"
            value={discountPercentInputValue}
            readOnly={showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs}
            onClick={() => {
              if (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs) {
                onInputRestrictedClick?.();
              }
            }}
            onChange={(event) => {
              if (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs) {
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
              if (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs) {
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
            className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-linen-50 px-2 text-xs text-ink-900 outline-none transition hover:border-linen-200 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 ${
              (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs)
                ? "cursor-not-allowed opacity-70"
                : ""
            }`}
          />
        )}
      </td>
      <td className="min-w-0 px-2 py-2">
        {showPqLineDatesAndQtys && !sellerFieldEditable ? (
          <input
            type="text"
            inputMode="decimal"
            value={Number(clampedDiscountAmount || 0).toFixed(2)}
            disabled
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            title="Discount amount is not editable"
            className="h-9 w-full min-w-0 cursor-not-allowed rounded-lg border border-linen-200 bg-linen-100 px-2 text-left text-xs text-neutral-500 outline-none opacity-80"
          />
        ) : (
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            title=""
            value={discountAmountInputValue}
            readOnly={showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs}
            onClick={() => {
              if (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs) {
                onInputRestrictedClick?.();
              }
            }}
            onChange={(event) => {
              if (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs) {
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
                grossAmount > 0
                  ? Math.round((nextAmount / grossAmount) * 100 * 1000000) / 1000000
                  : 0;
              updateProductRow(row.id, {
                discountAmount: nextAmount,
                discountPercent: nextPercent,
              });
            }}
            onBlur={(event) => {
              if (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs) {
                return;
              }
              const rawValue = event.target.value.trim();
              const rawAmount =
                rawValue === "" ? 0 : Math.round((Number(rawValue) || 0) * 100) / 100;
              const nextAmount = Math.min(grossAmount, rawAmount);
              const nextPercent =
                grossAmount > 0
                  ? Math.round((nextAmount / grossAmount) * 100 * 1000000) / 1000000
                  : 0;
              updateProductRow(row.id, {
                discountAmount: nextAmount,
                discountPercent: nextPercent,
              });
              clearProductRowDraft(row.id, "discountAmount");
            }}
            className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-linen-50 px-2 text-xs text-ink-900 outline-none transition hover:border-linen-200 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200 ${
              (showPqLineDatesAndQtys ? sellerFieldLocked : effectiveDisableInputs)
                ? "cursor-not-allowed opacity-70"
                : ""
            }`}
          />
        )}
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm text-ink-900">
        {unitNetPrice.toFixed(2)}
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm font-medium text-ink-900">
        {lineTotal.toFixed(2)}
      </td>
      {showGLAccount && (
        <td className="relative px-2 py-2 min-w-0">
          <div className="relative">
            <input
              ref={accountInputRef}
              type="text"
              value={accountInput}
              disabled={effectiveDisableInputs}
              onChange={(e) => {
                setAccountInput(e.target.value);
                setAccountFocused(true);
              }}
              onFocus={() => setAccountFocused(true)}
              onBlur={() => {
                blurTimerRef.current = setTimeout(() => setAccountFocused(false), 150);
              }}
              placeholder="G/L Account"
              className="h-9 w-full rounded-lg border border-linen-200 bg-linen-50 px-2 pr-8 text-xs text-ink-900 outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
            />
            <button
              type="button"
              disabled={effectiveDisableInputs}
              onClick={() => setAccountLookupOpen(true)}
              className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:bg-linen-100 hover:text-neutral-500 transition"
            >
              <Search className="h-3 w-3" />
            </button>
            <FixedDropdown
              anchorRef={accountInputRef}
              visible={accountFocused && accountSuggestions.length > 0}
            >
              <SuggestionList
                items={accountSuggestions}
                onSelect={(item) => {
                  setAccountInput(item.code);
                  updateProductRow(row.id, { accountCode: item.code });
                  setAccountFocused(false);
                }}
                query={accountInput}
                showCode
                codeLabel="GLAccount"
                nameLabel="Account"
              />
            </FixedDropdown>
          </div>
          <LookupPopup
            open={accountLookupOpen}
            mode="warehouse"
            search={accountInput}
            results={accountSuggestions}
            loading={accountQuery.isLoading}
            error={accountQuery.isError ? (accountQuery.error as Error).message : null}
            title="Search G/L Accounts"
            searchPlaceholder="Search account code or name..."
            codeLabel="GLAccount"
            nameLabel="Account"
            onSearchChange={(val) => {
              setAccountInput(val);
              setAccountFocused(true);
            }}
            onClose={() => setAccountLookupOpen(false)}
            onSelect={(item) => {
              setAccountInput(item.code);
              updateProductRow(row.id, { accountCode: item.code });
              setAccountLookupOpen(false);
            }}
          />
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
              className={`h-10 w-full rounded-xl border border-linen-200 bg-surface px-3 text-xs font-medium outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-200 ${
                effectiveDisableInputs
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:border-linen-200"
              } ${row.returnReason ? "text-ink-900" : "text-neutral-400"}`}
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
            disabled={snapshotLocked}
            onClick={() => {
              if (snapshotLocked) {
                onInputRestrictedClick?.();
                return;
              }
              removeProductRow(row.id);
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-linen-200 text-ink-900 transition ${
              snapshotLocked
                ? "cursor-not-allowed bg-linen-50 opacity-40"
                : "cursor-pointer bg-surface hover:bg-linen-50 hover:text-teal-600"
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
