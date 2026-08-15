import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";

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
/** Cap visible viewport so many lines don't push the page forever. */
const PRODUCT_TABLE_MAX_HEIGHT_CLASS = "max-h-[min(60vh,520px)]";

interface CreateProductTableProps {
  productRows: ProductRow[];
  productRowDrafts: Record<string, ProductRowDraft>;
  enforceStockLimit?: boolean;
  maxQuantity?: number | ((row: ProductRow) => number | undefined);
  linkedRow?: boolean | ((row: ProductRow) => boolean);
  openProductPopup: (rowId: string | null) => void;
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void;
  removeProductRow: (id: string) => void;
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
  setProductRowDraft,
  clearProductRowDraft,
  prefetchProducts,
  warehouses,
  warehousesLoading,
  disableLineInputs = false,
  onLineInputRestrictedClick,
  stockLimitReserve = 0,
  minStockToSelectWarehouse = 0,
  showExplicitZeroDiscount = false,
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
    9 +
    pqExtraCols +
    (showSelection ? 1 : 0) +
    (showReturnReason ? 1 : 0) +
    (showUom ? 1 : 0) +
    (showBinLocation ? 1 : 0) +
    (showGLAccount ? 1 : 0) +
    (showTaxCode ? 1 : 0);

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: productRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => PRODUCT_ROW_ESTIMATE_PX,
    overscan: PRODUCT_ROW_OVERSCAN,
    getItemKey: (index) => productRows[index]?.id ?? index,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return (
    <>
      <div className="px-2 py-2">
        <div ref={scrollParentRef} className={`${PRODUCT_TABLE_MAX_HEIGHT_CLASS} overflow-auto`}>
          <table
            className={`w-full table-fixed text-left text-sm text-ink-900 ${
              showPqLineDatesAndQtys ? "min-w-[1900px]" : "min-w-[1520px]"
            }`}
          >
            <thead className="sticky top-0 z-10 bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                {showSelection && <th className="w-[4%] px-2 py-2 text-center" />}
                <th className={`${showUom ? "w-[12%]" : "w-[16%]"} px-2 py-2`}>Product</th>
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
    </>
  );
}
