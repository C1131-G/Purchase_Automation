import { Check, Loader2 } from 'lucide-react'
import { type ComponentProps, memo, useEffect, useMemo, useRef, useState } from 'react'

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
  onSelectMultiple?: (products: ProductLookupItem[]) => void
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
  selected,
  onToggle,
}: {
  product: ProductLookupItem
  selected: boolean
  onToggle: () => void
}) {
  return (
    <tr
      key={`${product.code}-${product.name}`}
      className="cursor-pointer border-t border-zinc-100 transition hover:bg-zinc-50"
      onClick={(e) => {
        e.preventDefault()
        onToggle()
      }}
    >
      <td className="w-10 px-3 py-2">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
            selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-zinc-300 bg-white'
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </div>
      </td>
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
  onSelectMultiple,
}: ProductPopupModalProps) {
  const safeResults = useMemo(() => (Array.isArray(results) ? results : []), [results])
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollKey = warehouseCode?.trim() || '__no_warehouse__'
  const emptyMessage = search.trim()
    ? `No products match "${search.trim()}".`
    : warehouseCode
      ? 'No products available for selected warehouse.'
      : 'Select warehouse first to load products.'

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setSelectedCodes(new Set())
    }
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return
    const node = scrollContainerRef.current
    if (!node) return
    const saved = popupScrollState.get(scrollKey)
    if (typeof saved === 'number') {
      node.scrollTop = saved
    }
  }, [open, scrollKey])

  const toggleProduct = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  const handleAddSelected = () => {
    if (!onSelectMultiple) return
    const selectedProducts = safeResults.filter((p) => selectedCodes.has(p.code))
    if (selectedProducts.length > 0) {
      onSelectMultiple(selectedProducts)
    }
  }

  const allSelected = safeResults.length > 0 && safeResults.every((p) => selectedCodes.has(p.code))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedCodes(new Set())
    } else {
      setSelectedCodes(new Set(safeResults.map((p) => p.code)))
    }
  }

  const renderedRows = useMemo(
    () =>
      safeResults.map((product) => (
        <ProductPopupRow
          key={`${product.code}-${product.name}`}
          product={product}
          selected={selectedCodes.has(product.code)}
          onToggle={() => toggleProduct(product.code)}
        />
      )),
    [safeResults, selectedCodes],
  )

  return (
    <AnimatedModalShell open={open} onClose={onClose} panelClassName="max-w-4xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">Search Products</h3>
        <div className="flex items-center gap-2">
          {selectedCodes.size > 0 && onSelectMultiple && (
            <button
              onClick={handleAddSelected}
              className="flex h-8 items-center rounded-full border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              Confirm ({selectedCodes.size})
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 items-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="relative w-full">
            <input
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              placeholder="Search product code or name"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          {backgroundLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
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
              <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <button
                      onClick={toggleAll}
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                        allSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {allSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>
                  </th>
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
                      <td className="px-3 py-2" colSpan={5}>
                        <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : error && safeResults.length === 0 ? (
                  <LookupErrorState
                    colSpan={5}
                    message={error || 'Unable to load products. Please try again.'}
                    {...(onRetry ? { onRetry } : {})}
                  />
                ) : safeResults.length === 0 && !loading ? (
                  <ModalEmptyRow colSpan={5} message={emptyMessage} />
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
