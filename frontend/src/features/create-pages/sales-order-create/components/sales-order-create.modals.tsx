import { type ComponentProps, useMemo, useState } from 'react'

import { AnimatedModalShell } from '@/components/create/core/animated-modal-shell'
import {
  type ProductLookupItem,
  type ProductWarehouseStockItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  type LookupOption,
  type PopupMode,
  type StockPreviewProduct,
} from '@/features/create-pages/create-shared/utils/create-order.types'

type LookupPopupModalProps = {
  open: ComponentProps<typeof AnimatedModalShell>['open']
  mode: PopupMode
  search: string
  results: LookupOption[]
  loading: boolean
  error: string | null
  onSearchChange: (value: string) => void
  onClose: ComponentProps<typeof AnimatedModalShell>['onClose']
  onSelect: (customer: LookupOption) => void
}

type ProductPopupModalProps = {
  open: ComponentProps<typeof AnimatedModalShell>['open']
  warehouseCode?: string
  search: string
  results: ProductLookupItem[]
  loading: boolean
  error: string | null
  onSearchChange: (value: string) => void
  onClose: ComponentProps<typeof AnimatedModalShell>['onClose']
  onSelect: (product: ProductLookupItem) => void
}

type ProductWarehouseStockModalProps = {
  open: ComponentProps<typeof AnimatedModalShell>['open']
  product: StockPreviewProduct | null
  currentWarehouseCode?: string
  stocks: ProductWarehouseStockItem[]
  loading: boolean
  error: string | null
  onClose: ComponentProps<typeof AnimatedModalShell>['onClose']
  onAfterClose?: ComponentProps<typeof AnimatedModalShell>['onAfterClose']
}

const formatStockValue = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  return String(value)
}

type ModalStateRowProps = {
  colSpan: number
  tone: 'error' | 'muted'
  message: string
}

function ModalStateRow({ colSpan, tone, message }: ModalStateRowProps) {
  return (
    <tr>
      <td
        className={`px-3 py-6 text-center ${tone === 'error' ? 'text-red-600' : 'text-zinc-500'}`}
        colSpan={colSpan}
      >
        {message}
      </td>
    </tr>
  )
}

export function ProductPopupModal({
  open,
  warehouseCode,
  search,
  results,
  loading,
  error,
  onSearchChange,
  onClose,
  onSelect,
}: ProductPopupModalProps) {
  const safeResults = Array.isArray(results) ? results : []
  const emptyMessage = search.trim()
    ? `No products match "${search.trim()}".`
    : warehouseCode
      ? 'No products available for selected warehouse.'
      : 'Select warehouse first to load products.'

  return (
    <AnimatedModalShell open={open} onClose={onClose} panelClassName="max-w-4xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Search Products</h3>
          <p className="text-xs text-zinc-500">
            {warehouseCode ? `Warehouse: ${warehouseCode}` : 'Warehouse: -'}
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
          placeholder="Search product code or name"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">Code</th>
                  <th className="whitespace-nowrap px-3 py-2">Name</th>
                  <th className="whitespace-nowrap px-3 py-2">Stock</th>
                  <th className="whitespace-nowrap px-3 py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`product-skeleton-${index}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2" colSpan={4}>
                        <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <ModalStateRow
                    colSpan={4}
                    tone="error"
                    message={error || 'Unable to load products. Please try again.'}
                  />
                ) : safeResults.length === 0 ? (
                  <ModalStateRow colSpan={4} tone="muted" message={emptyMessage} />
                ) : (
                  safeResults.map((product) => (
                    <tr
                      key={`${product.code}-${product.name}`}
                      className="cursor-pointer border-t border-zinc-100 transition hover:bg-zinc-50"
                      onClick={() => onSelect(product)}
                    >
                      <td className="px-3 py-2 font-medium text-zinc-800">{product.code}</td>
                      <td className="px-3 py-2 text-zinc-700">{product.name}</td>
                      <td className="px-3 py-2 text-zinc-700">{product.stock}</td>
                      <td className="px-3 py-2 text-zinc-700">{product.price.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  )
}

export function ProductWarehouseStockModal({
  open,
  product,
  currentWarehouseCode,
  stocks,
  loading,
  error,
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
      {...(onAfterClose ? { onAfterClose } : {})}
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
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`stock-skeleton-${index}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2" colSpan={3}>
                        <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <ModalStateRow
                    colSpan={3}
                    tone="error"
                    message={error || 'Unable to load stock details. Please try again.'}
                  />
                ) : filteredStocks.length === 0 ? (
                  <ModalStateRow
                    colSpan={3}
                    tone="muted"
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

export function LookupPopupModal({
  open,
  mode,
  search,
  results,
  loading,
  error,
  onSearchChange,
  onClose,
  onSelect,
}: LookupPopupModalProps) {
  const safeResults = Array.isArray(results) ? results : []
  const modalTitle =
    mode === 'warehouse'
      ? 'Select Warehouse'
      : mode === 'sales-employee'
        ? 'Select Sales Employee'
        : `Select Customer by ${mode === 'vendor-name' ? 'Name' : 'Code'}`
  const searchPlaceholder =
    mode === 'warehouse'
      ? 'Search warehouse code or name'
      : mode === 'sales-employee'
        ? 'Search sales employee code or name'
        : 'Search customer name or code'

  return (
    <AnimatedModalShell open={open} onClose={onClose} panelClassName="max-w-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{modalTitle}</h3>
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
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`customer-skeleton-${index}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2" colSpan={2}>
                        <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <ModalStateRow
                    colSpan={2}
                    tone="error"
                    message={error || 'Unable to load data. Please try again.'}
                  />
                ) : safeResults.length === 0 ? (
                  <ModalStateRow
                    colSpan={2}
                    tone="muted"
                    message={
                      search.trim()
                        ? `No results match "${search.trim()}".`
                        : mode === 'warehouse'
                          ? 'No warehouses available.'
                          : mode === 'sales-employee'
                            ? 'No sales employees available.'
                            : 'No customers available.'
                    }
                  />
                ) : (
                  safeResults.map((customer, index) => (
                    <tr
                      key={`${customer.code}-${customer.name}-${index}`}
                      className="cursor-pointer border-t border-zinc-100 transition hover:bg-zinc-50"
                      onClick={() => onSelect(customer)}
                    >
                      <td className="px-3 py-2 font-medium text-zinc-800">{customer.code}</td>
                      <td className="px-3 py-2 text-zinc-700">{customer.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  )
}
