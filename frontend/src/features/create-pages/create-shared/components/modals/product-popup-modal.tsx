import { type ComponentProps, memo, useEffect, useMemo, useRef } from 'react'

import { LookupErrorState } from '@/components/lookup/lookup-error-state'
// ProductPopupModal: Orchestrates item selection, stock validation, and price lookup.
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { AnimatedModalShell } from '@/features/create-pages/create-shared/components/core/animated-modal-shell'

type ProductPopupModalProps = {
  open: ComponentProps<typeof AnimatedModalShell>['open']
  warehouseCode?: string
  search: string
  results: ProductLookupItem[]
  loading: boolean
  backgroundLoading?: boolean
  error: string | null
  onRetry?: () => void
  onSearchChange: (value: string) => void
  onReachEnd?: () => void
  onClose: ComponentProps<typeof AnimatedModalShell>['onClose']
  onSelect: (product: ProductLookupItem) => void
}

const popupScrollState = new Map<string, number>()

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

const ProductPopupRow = memo(function ProductPopupRow({
  product,
  onSelect,
}: {
  product: ProductLookupItem
  onSelect: (product: ProductLookupItem) => void
}) {
  return (
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
  )
})

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
}: ProductPopupModalProps) {
  const safeResults = useMemo(() => (Array.isArray(results) ? results : []), [results])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollKey = warehouseCode?.trim() || '__no_warehouse__'
  const emptyMessage = search.trim()
    ? `No products match "${search.trim()}".`
    : warehouseCode
      ? 'No products available for selected warehouse.'
      : 'Select warehouse first to load products.'

  useEffect(() => {
    if (!open) return
    const node = scrollContainerRef.current
    if (!node) return
    const saved = popupScrollState.get(scrollKey)
    if (typeof saved === 'number') {
      node.scrollTop = saved
    }
  }, [open, scrollKey])

  const renderedRows = useMemo(
    () =>
      safeResults.map((product) => (
        <ProductPopupRow
          key={`${product.code}-${product.name}`}
          product={product}
          onSelect={onSelect}
        />
      )),
    [safeResults, onSelect],
  )

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
        <div className="mb-3 flex items-center gap-3">
          <input
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            placeholder="Search product code or name"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {backgroundLoading ? (
            <span className="whitespace-nowrap text-xs font-medium text-zinc-500">Updating...</span>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div
            ref={scrollContainerRef}
            className="max-h-80 overflow-auto"
            onScroll={(event) => {
              popupScrollState.set(scrollKey, event.currentTarget.scrollTop)
              if (!onReachEnd || loading) return
              const target = event.currentTarget
              const threshold = 32
              const reachedEnd =
                target.scrollHeight - target.scrollTop - target.clientHeight <= threshold
              if (reachedEnd) onReachEnd()
            }}
          >
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
                {loading && safeResults.length === 0 ? (
                  SKELETON_ROW_KEYS.map((slot) => (
                    <tr key={`product-skeleton-${slot}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2" colSpan={4}>
                        <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : error && safeResults.length === 0 ? (
                  <LookupErrorState
                    colSpan={4}
                    message={error || 'Unable to load products. Please try again.'}
                    {...(onRetry ? { onRetry } : {})}
                  />
                ) : safeResults.length === 0 && !loading ? (
                  <ModalEmptyRow colSpan={4} message={emptyMessage} />
                ) : (
                  renderedRows
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  )
}
