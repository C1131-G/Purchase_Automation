import { CreateProductTableRow } from '@/features/create-pages/create-shared/components/tables/create-product-table-row'
import { calculateOrderTotals } from '@/features/create-pages/create-shared/utils/create-order.calculations'
import {
  type ProductRow,
  type ProductRowDraft,
  type StockPreviewProduct,
} from '@/features/create-pages/create-shared/utils/create-order.types'

interface CreateProductTableProps {
  productRows: ProductRow[]
  productRowDrafts: Record<string, ProductRowDraft>
  effectiveWarehouseCode: string
  openProductPopup: (rowId: string | null) => void
  openStockPreview: (product: StockPreviewProduct) => void
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void
  removeProductRow: (id: string) => void
  setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => void
  clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => void
  prefetchProducts: () => void
  totals: ReturnType<typeof calculateOrderTotals>
  summaryCurrencyLabel: string | null
  createError: string | null
}

export function CreateProductTable({
  productRows,
  productRowDrafts,
  effectiveWarehouseCode,
  openProductPopup,
  openStockPreview,
  updateProductRow,
  removeProductRow,
  setProductRowDraft,
  clearProductRowDraft,
  prefetchProducts,
}: CreateProductTableProps) {
  return (
    <div className="overflow-x-auto px-2 py-2">
      <table className="min-w-245 w-full text-left text-sm text-zinc-700">
        <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          <tr>
            <th className="whitespace-nowrap px-3 py-2">Product</th>
            <th className="whitespace-nowrap px-3 py-2">Quantity</th>
            <th className="whitespace-nowrap px-3 py-2">Price</th>
            <th className="whitespace-nowrap px-3 py-2">Discount %</th>
            <th className="whitespace-nowrap px-3 py-2">Discount Amount</th>
            <th className="whitespace-nowrap px-3 py-2">Net Price</th>
            <th className="whitespace-nowrap px-3 py-2">Total</th>
            <th className="whitespace-nowrap px-3 py-2">Comments</th>
            <th className="whitespace-nowrap px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {productRows.length === 0 ? (
            <tr>
              <td className="px-3 py-8" colSpan={9}>
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
              effectiveWarehouseCode={effectiveWarehouseCode}
              openProductPopup={openProductPopup}
              openStockPreview={openStockPreview}
              updateProductRow={updateProductRow}
              removeProductRow={removeProductRow}
              setProductRowDraft={setProductRowDraft}
              clearProductRowDraft={clearProductRowDraft}
              prefetchProducts={prefetchProducts}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
