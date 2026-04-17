import { CreateProductTableRow } from '@/features/create-pages/create-shared/components/tables/create-product-table-row'
import { calculateOrderTotals } from '@/features/create-pages/create-shared/utils/create-order.calculations'
import {
  type CreateLookupOption,
  type ProductRow,
  type ProductRowDraft,
} from '@/features/create-pages/create-shared/utils/create-order.types'
// CreateProductTable: Specialized data grid for building document line items.

interface CreateProductTableProps {
  productRows: ProductRow[]
  productRowDrafts: Record<string, ProductRowDraft>
  enforceStockLimit?: boolean
  maxQuantity?: number | ((row: ProductRow) => number | undefined)
  linkedRow?: boolean | ((row: ProductRow) => boolean)
  openProductPopup: (rowId: string | null) => void
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void
  removeProductRow: (id: string) => void
  setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => void
  clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => void
  prefetchProducts: () => void
  totals: ReturnType<typeof calculateOrderTotals>
  summaryCurrencyLabel: string | null
  createError: string | null
  warehouses: CreateLookupOption[]
  warehousesLoading: boolean
  disableLineInputs?: boolean
  onLineInputRestrictedClick?: () => void
  stockLimitReserve?: number
  minStockToSelectWarehouse?: number
  showExplicitZeroDiscount?: boolean
  showSelection?: boolean
  showReturnReason?: boolean
  showTaxCode?: boolean
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
  showTaxCode = false,
  linkedRow = false,
}: CreateProductTableProps) {
  return (
    <div className="overflow-x-auto px-2 py-2">
      <table className="min-w-300 w-full table-fixed text-left text-sm text-zinc-700">
        <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          <tr>
            {showSelection && <th className="w-[4%] px-2 py-2 text-center" />}
            <th className="w-[20%] px-2 py-2">Product</th>
            <th className="w-[26%] px-2 py-2">Warehouse</th>
            <th className="w-[8%] px-2 py-2 text-left">Quantity</th>
            <th className="w-[6%] px-2 py-2 text-left">Price</th>
            <th className="w-[8%] px-2 py-2 text-left">Disc %</th>
            <th className="w-[8%] px-2 py-2 text-left text-wrap">Disc Amt</th>
            <th className="w-[8%] px-2 py-2 text-left text-wrap">Net Price</th>
            <th className="w-[8%] px-2 py-2 text-left">Total</th>
            {showTaxCode && <th className="w-[10%] px-2 py-2 text-left">Tax Code</th>}
            {showReturnReason && <th className="w-[12%] px-2 py-2 text-left">Return Reason</th>}
            <th className="w-[8%] px-2 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {productRows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-8"
                colSpan={
                  9 + (showSelection ? 1 : 0) + (showReturnReason ? 1 : 0) + (showTaxCode ? 1 : 0)
                }
              >
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                  <div className="text-sm font-medium text-zinc-700">No products yet</div>
                  <div className="text-xs text-zinc-500">
                    Use <span className="font-semibold text-zinc-700">Search Products</span> to add
                    items.
                  </div>
                </div>
              </td>
            </tr>
          ) : null}
          {productRows.map((row) => (
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
              showTaxCode={showTaxCode}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
