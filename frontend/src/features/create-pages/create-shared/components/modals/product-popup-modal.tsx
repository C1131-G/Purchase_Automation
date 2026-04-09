import { Check, Loader2 } from 'lucide-react'
import { type ComponentProps, memo, useCallback, useEffect, useMemo, useRef } from 'react'

import { LookupErrorState } from '@/components/lookup/lookup-error-state'
// ProductPopupModal: Orchestrates item selection, stock validation, and price lookup.
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { AnimatedModalShell } from '@/features/create-pages/create-shared/components/core/animated-modal-shell'
import {
  EMPTY_SET,
  useClosePickerAction,
  useOpenPickerAction,
  useSelectedCodesForKey,
  useSelectSingleAction,
  useToggleCodeAction,
} from '@/store/create/product-picker.store'

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
  /** The product code of the currently active row, used to seed selection state. */
  selectedProductCode?: string | null | undefined
  /** The row ID being edited — used as key for persisted selection state. */
  selectedProductRowId?: string | null | undefined
  /** Product codes already in the document (for duplicate blocking). */
  existingProductCodes?: Set<string> | undefined
  /** Called when the user clicks a disabled (duplicate) product row. */
  onBlockDuplicate?: (() => void) | undefined
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
  disabled = false,
  onToggle,
  onBlockDuplicate,
}: {
  product: ProductLookupItem
  selected: boolean
  disabled?: boolean
  onToggle: () => void
  onBlockDuplicate?: (() => void) | undefined
}) {
  return (
    <tr
      key={`${product.code}-${product.name}`}
      className={`border-t border-zinc-100 transition-all duration-150 ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : `cursor-pointer ${selected ? 'bg-blue-50/60 hover:bg-blue-100/70' : 'hover:bg-blue-50/40'}`
      }`}
      onClick={(e) => {
        e.preventDefault()
        if (disabled) {
          onBlockDuplicate?.()
          return
        }
        onToggle()
      }}
    >
      <td className="w-10 px-3 py-2">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-150 ${
            selected
              ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20'
              : 'border-zinc-300 bg-white group-hover:border-blue-300'
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
  onSelect,
  onSelectMultiple,
  selectedProductCode,
  selectedProductRowId,
  existingProductCodes = EMPTY_SET,
  onBlockDuplicate,
}: ProductPopupModalProps) {
  const safeResults = useMemo(() => (Array.isArray(results) ? results : []), [results])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollKey = warehouseCode?.trim() || '__no_warehouse__'
  const emptyMessage = search.trim()
    ? `No products match "${search.trim()}".`
    : warehouseCode
      ? 'No products available for selected warehouse.'
      : 'Select warehouse first to load products.'

  /* ---------- normalize optional props ---------- */
  const normalizedProductCode = selectedProductCode ?? null
  // Use a stable fallback key for document-level search so selection works
  // even when no row ID is provided.
  const normalizedRowId = selectedProductRowId ?? '__document_search__'

  /* ---------- store hooks ---------- */
  const pickerKey = normalizedRowId
  const selectedCodes = useSelectedCodesForKey(pickerKey)
  const openPicker = useOpenPickerAction()
  const toggleCode = useToggleCodeAction()
  const selectSingle = useSelectSingleAction()
  const closePicker = useClosePickerAction()

  /* ---------- detect mode ---------- */
  // Row-level editing: single-select — click replaces and auto-applies.
  // Document-level search: multi-select — click toggles, Confirm applies.
  const isRowLevel = selectedProductRowId != null && selectedProductRowId !== '__document_search__'

  /* ---------- always seed fresh on open — no persistence ---------- */
  useEffect(() => {
    if (!open) return

    let targetCodes: Set<string>

    if (normalizedProductCode) {
      // Row-level: seed with the row's current product code so user sees what's selected
      targetCodes = new Set([normalizedProductCode])
    } else {
      // Document-level or empty row: start fresh
      targetCodes = EMPTY_SET
    }

    openPicker(pickerKey, targetCodes)
  }, [open, pickerKey, normalizedProductCode, openPicker])

  /* ---------- scroll restore ---------- */
  useEffect(() => {
    if (!open) return
    const node = scrollContainerRef.current
    if (!node) return
    const saved = popupScrollState.get(scrollKey)
    if (typeof saved === 'number') {
      node.scrollTop = saved
    }
  }, [open, scrollKey])

  /* ---------- close handler ---------- */
  const handleInternalClose = useCallback(() => {
    closePicker(pickerKey)
    onClose()
  }, [pickerKey, closePicker, onClose])

  const handleAddSelected = useCallback(() => {
    if (!onSelectMultiple) return
    const selectedProducts = safeResults.filter((p) => selectedCodes.has(p.code))
    if (selectedProducts.length > 0) onSelectMultiple(selectedProducts)
  }, [onSelectMultiple, safeResults, selectedCodes])

  /* ---------- row click handler ---------- */
  const handleProductSelect = useCallback(
    (product: ProductLookupItem) => {
      if (isRowLevel) {
        // Single-select: replace selection, apply immediately, close
        selectSingle(pickerKey, product.code)
        onSelect(product)
        closePicker(pickerKey)
        onClose()
      } else {
        // Multi-select: toggle selection, user clicks Confirm to apply
        toggleCode(pickerKey, product.code)
      }
    },
    [isRowLevel, pickerKey, selectSingle, toggleCode, onSelect, closePicker, onClose],
  )

  const renderedRows = useMemo(
    () =>
      safeResults.map((product) => {
        const isDuplicate = !isRowLevel && existingProductCodes.has(product.code)
        return (
          <ProductPopupRow
            key={`${product.code}-${product.name}`}
            product={product}
            selected={selectedCodes.has(product.code)}
            disabled={isDuplicate}
            onToggle={() => handleProductSelect(product)}
            onBlockDuplicate={onBlockDuplicate}
          />
        )
      }),
    [
      safeResults,
      selectedCodes,
      handleProductSelect,
      isRowLevel,
      existingProductCodes,
      onBlockDuplicate,
    ],
  )

  return (
    <AnimatedModalShell open={open} onClose={handleInternalClose} panelClassName="max-w-4xl">
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
            onClick={handleInternalClose}
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
                  <th className="w-10 px-3 py-2" />
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
