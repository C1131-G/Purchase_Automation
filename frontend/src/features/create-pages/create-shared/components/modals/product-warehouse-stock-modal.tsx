// ProductWarehouseStockModal: Displays real-time inventory levels across multiple warehouses.
import { type ComponentProps, useMemo, useState } from 'react'

import { LookupErrorState } from '@/components/lookup/lookup-error-state'
import { type ProductWarehouseStockItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { AnimatedModalShell } from '@/features/create-pages/create-shared/components/core/animated-modal-shell'
import { type StockPreviewProduct } from '@/features/create-pages/create-shared/utils/create-order.types'

type ProductWarehouseStockModalProps = {
  open: ComponentProps<typeof AnimatedModalShell>['open']
  product: StockPreviewProduct | null
  currentWarehouseCode?: string
  stocks: ProductWarehouseStockItem[]
  loading: boolean
  error: string | null
  onRetry?: () => void
  onClose: ComponentProps<typeof AnimatedModalShell>['onClose']
  onAfterClose?: ComponentProps<typeof AnimatedModalShell>['onAfterClose']
}

const formatStockValue = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  return String(value)
}

function ModalEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-4">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-5 text-center">
          <p className="text-xs font-medium text-zinc-500">{message}</p>
        </div>
      </td>
    </tr>
  )
}

const SKELETON_ROW_KEYS = ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5', 'slot-6'] as const

export function ProductWarehouseStockModal({
  open,
  product,
  currentWarehouseCode,
  stocks,
  loading,
  error,
  onRetry,
  onClose,
  onAfterClose,
}: ProductWarehouseStockModalProps) {
  const [warehouseSearch, setWarehouseSearch] = useState('')
  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks])
  const sortedStocks = useMemo(
    () => [...safeStocks].sort((a, b) => b.stock - a.stock || a.code.localeCompare(b.code)),
    [safeStocks],
  )
  const filteredStocks = useMemo(() => {
    const term = warehouseSearch.trim().toLowerCase()
    if (!term) return sortedStocks
    return sortedStocks.filter(
      (stockItem) =>
        stockItem.code.toLowerCase().includes(term) || stockItem.name.toLowerCase().includes(term),
    )
  }, [sortedStocks, warehouseSearch])

  return (
    <AnimatedModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-2xl"
      onAfterClose={onAfterClose}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Stock by Warehouse</h3>
          <p className="truncate text-xs text-zinc-500">
            {product ? `${product.code} - ${product.name}` : '-'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        <input
          className="mb-3 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          placeholder="Search warehouse code or name"
          value={warehouseSearch}
          onChange={(event) => setWarehouseSearch(event.target.value)}
        />
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Warehouse</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredStocks.length === 0 ? (
                  SKELETON_ROW_KEYS.map((slot) => (
                    <tr key={`stock-skeleton-${slot}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2" colSpan={3}>
                        <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : error && filteredStocks.length === 0 ? (
                  <LookupErrorState
                    colSpan={3}
                    message={error || 'Unable to load stock details. Please try again.'}
                    {...(onRetry ? { onRetry } : {})}
                  />
                ) : filteredStocks.length === 0 && !loading ? (
                  <ModalEmptyRow
                    colSpan={3}
                    message={
                      warehouseSearch.trim()
                        ? `No warehouses match "${warehouseSearch.trim()}".`
                        : 'No stock data available for this product.'
                    }
                  />
                ) : (
                  filteredStocks.map((stockItem) => {
                    const isCurrentWarehouse =
                      stockItem.code.toLowerCase() === currentWarehouseCode?.toLowerCase()

                    return (
                      <tr
                        key={stockItem.code}
                        className={`border-t border-zinc-100 ${isCurrentWarehouse ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-3 py-2 font-medium text-zinc-800">{stockItem.code}</td>
                        <td className="px-3 py-2 text-zinc-700">{stockItem.name}</td>
                        <td className="px-3 py-2 text-right font-medium text-zinc-900">
                          {formatStockValue(stockItem.stock)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  )
}
