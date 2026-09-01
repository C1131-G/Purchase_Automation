import { useVirtualizer } from "@tanstack/react-virtual";
import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ProductLotAllocationModal } from "@/features/create-pages/create-shared/components/modals/product-lot-allocation-modal";
import { CreateProductTableRow } from "@/features/create-pages/create-shared/components/tables/create-product-table-row";
import type { calculateOrderTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type {
  CreateLookupOption,
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  hasLotAllocations,
  isLotManaged,
} from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import type { TaxDocumentSide } from "@/features/create-pages/create-shared/utils/product-tax-codes";

// CreateProductTable: Specialized data grid for building document line items.
// Rows are windowed with TanStack Virtual so large copy-from / multi-line docs stay responsive.

/** Estimated row height (h-9 inputs + py-2 padding). Dynamic measure refines after paint. */
const PRODUCT_ROW_ESTIMATE_PX = 56;
const PRODUCT_ROW_OVERSCAN = 4;
/** Keep the inline table viewport to ten standard product rows plus its header. */
const PRODUCT_TABLE_VISIBLE_ROWS = 10;
const PRODUCT_TABLE_HEADER_ESTIMATE_PX = 40;
const PRODUCT_TABLE_MAX_HEIGHT_PX =
  PRODUCT_ROW_ESTIMATE_PX * PRODUCT_TABLE_VISIBLE_ROWS + PRODUCT_TABLE_HEADER_ESTIMATE_PX;

interface CreateProductTableProps {
  productRows: ProductRow[];
  productRowDrafts: Record<string, ProductRowDraft>;
  enforceStockLimit?: boolean;
  maxQuantity?: number | ((row: ProductRow) => number | undefined);
  linkedRow?: boolean | ((row: ProductRow) => boolean);
  openProductPopup: (rowId: string | null) => void;
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void;
  removeProductRow: (id: string) => void;
  canRemoveProductRow?: (row: ProductRow) => boolean;
  setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => void;
  clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => void;
  prefetchProducts: () => void;
  totals: ReturnType<typeof calculateOrderTotals>;
  summaryCurrencyLabel: string | null;
  createError: string | null;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  disableLineInputs?: boolean;
  onLineInputRestrictedClick?: () => void;
  stockLimitReserve?: number;
  minStockToSelectWarehouse?: number;
  showExplicitZeroDiscount?: boolean;
  showSelection?: boolean;
  showReturnReason?: boolean;
  nativeReturnReason?: boolean;
  warehouseErrors?: Record<string, string> | undefined;
  showUom?: boolean;
  uoms?: CreateLookupOption[];
  showBinLocation?: boolean;
  showGLAccount?: boolean;
  /**
   * Purchase Quotation only: after UoM show Required Date, Quoted Date,
   * Required Qty, Quoted Qty (replaces single Quantity column).
   */
  showPqLineDatesAndQtys?: boolean;
  /** Buyer PQ estimates use Required Qty while Quoted Qty is still zero. */
  useRequiredQuantityForAmounts?: boolean;
  /** PQ Valid Until — line Required Date cannot be after this. */
  lineRequiredDateMax?: string;
  /** PQ minimum selectable line Required Date. */
  lineRequiredDateMin?: string;
  /** RFQ Valid Until — line Quoted Date cannot be after this. */
  rfqQuotedDateMax?: string;
  /** RFQ minimum selectable line Quoted Date. */
  rfqQuotedDateMin?: string;
  /**
   * RFQ seller fill: same PQ columns, but only quoted qty/date, price, disc %/amt editable.
   * Product, warehouse, UoM, required date/qty stay locked.
   */
  rfqSellerFill?: boolean;
  /**
   * RFQ submit validation: red borders on missing quoted qty / date / price per row id.
   */
  lineFieldErrors?: Record<string, { price?: boolean; quantity?: boolean; quotedDate?: boolean }>;
  /** Line tax group (OVTG). Default on — create and edit share this table. */
  showTaxCode?: boolean;
  taxCodes?: CreateLookupOption[];
  taxSide?: TaxDocumentSide;
  /** GRPO create/edit only: require batch/serial on managed items. */
  lotRequired?: boolean;
  /** When set, the row button opens a full lot page instead of the modal. */
  onOpenLotPage?: (row: ProductRow) => void;
}

export function CreateProductTable({
  productRows,
  productRowDrafts,
  enforceStockLimit = true,
  maxQuantity,
  openProductPopup,
  updateProductRow,
  removeProductRow,
  canRemoveProductRow,
  setProductRowDraft,
  clearProductRowDraft,
  prefetchProducts,
  warehouses,
  warehousesLoading,
  disableLineInputs = false,
  onLineInputRestrictedClick,
  stockLimitReserve = 0,
  minStockToSelectWarehouse = 0,
  showExplicitZeroDiscount = true,
  showSelection = false,
  showReturnReason = false,
  nativeReturnReason = false,
  linkedRow = false,
  warehouseErrors,
  showUom = false,
  uoms = [],
  showBinLocation = false,
  showGLAccount = false,
  showPqLineDatesAndQtys = false,
  useRequiredQuantityForAmounts = false,
  lineRequiredDateMax = "",
  lineRequiredDateMin = "",
  rfqQuotedDateMax = "",
  rfqQuotedDateMin = "",
  rfqSellerFill = false,
  lineFieldErrors,
  showTaxCode = true,
  taxCodes = [],
  taxSide = "purchase",
  lotRequired = false,
  onOpenLotPage,
}: CreateProductTableProps) {
  const lotMode = taxSide === "sales" ? "select" : "enter";
  const [lotRowId, setLotRowId] = useState<string | null>(null);
  const promptedLotsRef = useRef(new Set<string>());
  const useLotPage = Boolean(onOpenLotPage);

  useEffect(() => {
    if (!lotRequired || useLotPage) {
      return;
    }
    const liveIds = new Set(productRows.map((row) => `${row.id}:${row.productCode}`));
    for (const key of promptedLotsRef.current) {
      if (!liveIds.has(key)) {
        promptedLotsRef.current.delete(key);
      }
    }
    if (lotRowId) {
      return;
    }
    for (const row of productRows) {
      const key = `${row.id}:${row.productCode}`;
      if (!isLotManaged(row) || promptedLotsRef.current.has(key)) {
        continue;
      }
      promptedLotsRef.current.add(key);
      if (!hasLotAllocations(row)) {
        setLotRowId(row.id);
        break;
      }
    }
  }, [lotRequired, lotRowId, productRows, useLotPage]);

  const lotRow = lotRowId ? (productRows.find((row) => row.id === lotRowId) ?? null) : null;
  const pqExtraCols = showPqLineDatesAndQtys ? 3 : 0; // +req date, quoted date, req qty (quoted replaces Quantity)
  const emptyColSpan =
    10 +
    pqExtraCols +
    (showSelection ? 1 : 0) +
    (showReturnReason ? 1 : 0) +
    (showUom ? 1 : 0) +
    (showBinLocation ? 1 : 0) +
    (showGLAccount ? 1 : 0) +
    (showTaxCode ? 1 : 0);

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fullscreenToggleRef = useRef<HTMLButtonElement>(null);
  const wasFullscreenRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const element = fullscreenRef.current;
    if (!element || typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      // Browsers can reject fullscreen requests (for example, when permissions are denied).
      // Keep the inline table usable and let fullscreenchange remain the source of truth.
    }
  }, []);

  useEffect(function syncProductTableFullscreenState() {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === fullscreenRef.current;
      setIsFullscreen(active);
      if (wasFullscreenRef.current && !active) {
        fullscreenToggleRef.current?.focus();
      }
      wasFullscreenRef.current = active;
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return function removeProductTableFullscreenListener() {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: productRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => PRODUCT_ROW_ESTIMATE_PX,
    overscan: PRODUCT_ROW_OVERSCAN,
    getItemKey: (index) => productRows[index]?.id ?? index,
  });

  useLayoutEffect(() => {
    if (productRows.length === 0) {
      return;
    }
    rowVirtualizer.measure();
  }, [productRows.length, rowVirtualizer]);

  const measuredRows = rowVirtualizer.getVirtualItems();
  const virtualRows =
    measuredRows.length > 0
      ? measuredRows
      : productRows.slice(0, PRODUCT_ROW_OVERSCAN + 8).map((_, index) => ({
          index,
          key: productRows[index]?.id ?? index,
          start: index * PRODUCT_ROW_ESTIMATE_PX,
          size: PRODUCT_ROW_ESTIMATE_PX,
          end: (index + 1) * PRODUCT_ROW_ESTIMATE_PX,
        }));
  const totalSize = Math.max(
    rowVirtualizer.getTotalSize(),
    productRows.length * PRODUCT_ROW_ESTIMATE_PX,
  );
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return (
    <div
      ref={fullscreenRef}
      className={isFullscreen ? "flex h-[100dvh] min-h-0 w-full flex-col bg-surface p-3" : ""}
    >
      <div className={isFullscreen ? "flex min-h-0 flex-1 flex-col" : "px-2 py-2"}>
        <div className="mb-1 flex justify-end">
          <button
            ref={fullscreenToggleRef}
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Minimize product table" : "Maximize product table"}
            aria-pressed={isFullscreen}
            className="inline-flex min-h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-linen-200 bg-white px-2 text-ink-700 shadow-sm transition-colors hover:bg-linen-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            {isFullscreen ? (
              <Minimize2 aria-hidden="true" className="size-4" />
            ) : (
              <Maximize2 aria-hidden="true" className="size-4" />
            )}
            <span className="sr-only">
              {isFullscreen ? "Minimize product table" : "Maximize product table"}
            </span>
          </button>
        </div>
        <div
          ref={scrollParentRef}
          tabIndex={0}
          aria-label="Product lines scroll area"
          className={isFullscreen ? "min-h-0 flex-1 overflow-auto" : "overflow-auto"}
          style={
            isFullscreen
              ? undefined
              : { maxHeight: `min(${PRODUCT_TABLE_MAX_HEIGHT_PX}px, calc(100dvh - 14rem))` }
          }
        >
          <table
            className={`w-full table-fixed text-left text-sm text-ink-900 ${
              showPqLineDatesAndQtys ? "min-w-[2100px]" : "min-w-[1720px]"
            }`}
          >
            <caption className="sr-only">Document product lines</caption>
            <thead className="sticky top-0 z-10 bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                {showSelection && <th scope="col" className="w-[4%] px-2 py-2 text-center" />}
                <th scope="col" className={`${showUom ? "w-[18%]" : "w-[22%]"} px-2 py-2`}>
                  Description
                </th>
                <th className={`${showUom ? "w-[15%]" : "w-[18%]"} px-2 py-2`}>Warehouse</th>
                {showBinLocation && <th className="w-[10%] px-2 py-2 text-left">Bin Location</th>}
                {showUom && <th className="w-[7%] px-2 py-2 text-left">UoM</th>}
                {showPqLineDatesAndQtys ? (
                  <>
                    <th className="w-[8%] px-2 py-2 text-left">Required Date</th>
                    <th className="w-[8%] px-2 py-2 text-left">Quoted Date</th>
                    <th className="w-[7%] px-2 py-2 text-left">Required Qty</th>
                    <th className="w-[7%] px-2 py-2 text-left">Quoted Qty</th>
                  </>
                ) : (
                  <th className="w-[7%] px-2 py-2 text-left">Quantity</th>
                )}
                <th className="w-[7%] px-2 py-2 text-left">Price</th>
                <th className="w-[7%] px-2 py-2 text-left">Disc %</th>
                <th className="w-[7%] px-2 py-2 text-left text-wrap">Disc Amt</th>
                {showTaxCode && <th className="w-[8%] px-2 py-2 text-left">Tax Code</th>}
                <th className="w-[7%] px-2 py-2 text-left text-wrap">Net Price</th>
                <th className="w-[7%] px-2 py-2 text-left">Total</th>
                {showGLAccount && <th className="w-[12%] px-2 py-2 text-left">G/L Account</th>}
                {showReturnReason && <th className="w-[10%] px-2 py-2 text-left">Return Reason</th>}
                <th className={`${lotRequired ? "w-[10%]" : "w-[7%]"} px-2 py-2 text-right`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {productRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-8" colSpan={emptyColSpan}>
                    <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-linen-200 bg-linen-50 px-4 py-6 text-center">
                      <div className="text-sm font-medium text-ink-900">No products yet</div>
                      <div className="text-xs text-neutral-500">
                        Use <span className="font-semibold text-ink-900">Search Products</span> to
                        add items.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
              {paddingTop > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={emptyColSpan}
                    style={{ height: paddingTop, padding: 0, border: 0 }}
                  />
                </tr>
              ) : null}
              {virtualRows.map((virtualRow) => {
                const row = productRows[virtualRow.index];
                if (!row) {
                  return null;
                }
                return (
                  <CreateProductTableRow
                    key={row.id}
                    row={row}
                    rowDraft={productRowDrafts[row.id]}
                    enforceStockLimit={enforceStockLimit}
                    {...(maxQuantity !== undefined && { maxQuantity })}
                    {...(linkedRow !== undefined && { linkedRow })}
                    openProductPopup={openProductPopup}
                    updateProductRow={updateProductRow}
                    removeProductRow={removeProductRow}
                    canRemoveProductRow={canRemoveProductRow?.(row)}
                    setProductRowDraft={setProductRowDraft}
                    clearProductRowDraft={clearProductRowDraft}
                    prefetchProducts={prefetchProducts}
                    warehouses={warehouses}
                    warehousesLoading={warehousesLoading}
                    disableInputs={disableLineInputs}
                    onInputRestrictedClick={onLineInputRestrictedClick}
                    stockLimitReserve={stockLimitReserve}
                    minStockToSelectWarehouse={minStockToSelectWarehouse}
                    showExplicitZeroDiscount={showExplicitZeroDiscount}
                    showSelection={showSelection}
                    showReturnReason={showReturnReason}
                    nativeReturnReason={nativeReturnReason}
                    warehouseError={warehouseErrors?.[row.id]}
                    showUom={showUom}
                    uoms={uoms}
                    showBinLocation={showBinLocation}
                    showGLAccount={showGLAccount}
                    showPqLineDatesAndQtys={showPqLineDatesAndQtys}
                    useRequiredQuantityForAmounts={useRequiredQuantityForAmounts}
                    lineRequiredDateMax={lineRequiredDateMax}
                    lineRequiredDateMin={lineRequiredDateMin}
                    rfqQuotedDateMax={rfqQuotedDateMax}
                    rfqQuotedDateMin={rfqQuotedDateMin}
                    rfqSellerFill={rfqSellerFill}
                    lineFieldInvalid={lineFieldErrors?.[row.id]}
                    showTaxCode={showTaxCode}
                    taxCodes={taxCodes}
                    taxSide={taxSide}
                    lotRequired={lotRequired}
                    {...(lotRequired
                      ? {
                          onOpenLotAllocation: () =>
                            onOpenLotPage ? onOpenLotPage(row) : setLotRowId(row.id),
                        }
                      : {})}
                  />
                );
              })}
              {paddingBottom > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={emptyColSpan}
                    style={{ height: paddingBottom, padding: 0, border: 0 }}
                  />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {lotRequired && !useLotPage ? (
        <ProductLotAllocationModal
          mode={lotMode}
          open={Boolean(lotRow)}
          required={lotRequired}
          row={lotRow}
          onClose={() => setLotRowId(null)}
          onSave={(patch) => {
            if (!lotRow) {
              return;
            }
            updateProductRow(lotRow.id, patch);
          }}
        />
      ) : null}
    </div>
  );
}
