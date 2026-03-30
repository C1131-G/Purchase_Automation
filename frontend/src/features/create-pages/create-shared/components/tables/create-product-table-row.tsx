import { useQuery } from '@tanstack/react-query'
import { Search, Trash2 } from 'lucide-react'
import React from 'react'
import ReactDOM from 'react-dom'

import { Tooltip } from '@/components/tooltip'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { SuggestionList } from '@/features/create-pages/create-shared/components/core/suggestion-list'
import { ProductWarehouseStockModal } from '@/features/create-pages/create-shared/components/modals/product-warehouse-stock-modal'
import {
  type CreateLookupOption,
  type ProductRow,
  type ProductRowDraft,
} from '@/features/create-pages/create-shared/utils/create-order.types'

interface CreateProductTableRowProps {
  row: ProductRow
  rowDraft?: ProductRowDraft | undefined
  enforceStockLimit?: boolean
  openProductPopup: (rowId: string | null) => void
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void
  removeProductRow: (id: string) => void
  setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => void
  clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => void
  prefetchProducts: () => void
  warehouses: CreateLookupOption[]
  warehousesLoading: boolean
  disableInputs?: boolean
  onInputRestrictedClick?: (() => void) | undefined
  stockLimitReserve?: number
  minStockToSelectWarehouse?: number
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
}: CreateProductTableRowProps) {
  const [warehouseInput, setWarehouseInput] = React.useState('')
  const [warehouseLookupInitialSearch, setWarehouseLookupInitialSearch] = React.useState('')
  const [warehouseFocused, setWarehouseFocused] = React.useState(false)
  const [lookupOpen, setLookupOpen] = React.useState(false)
  const blurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const warehouseInputRef = React.useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties | null>(null)

  const syncDropdownPosition = React.useCallback(() => {
    const rect = warehouseInputRef.current?.getBoundingClientRect()
    if (!rect) return
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }, [])

  // Continuously re-anchor the portal dropdown to the input element.
  // Using captures scroll listener so any scroll container (including overflow-x-auto table) triggers a re-sync.
  React.useLayoutEffect(() => {
    if (!warehouseFocused) return
    syncDropdownPosition()
    window.addEventListener('scroll', syncDropdownPosition, true)
    window.addEventListener('resize', syncDropdownPosition)
    return () => {
      window.removeEventListener('scroll', syncDropdownPosition, true)
      window.removeEventListener('resize', syncDropdownPosition)
    }
  }, [warehouseFocused, syncDropdownPosition])

  const stocksQuery = useQuery({
    ...createSharedQueries.productWarehouseStocks(row.productCode),
    enabled: Boolean(row.productCode),
  })
  const stocks = React.useMemo(() => stocksQuery.data ?? [], [stocksQuery.data])

  // Sync warehouseInput with row.warehouseCode or matching warehouse name
  const committedWarehouseName = React.useMemo(() => {
    const matched = warehouses.find((w) => w.code === row.warehouseCode)
    return matched?.name ?? row.warehouseCode
  }, [row.warehouseCode, warehouses])

  React.useEffect(() => {
    // Keep inline display aligned with committed row value when selection changes externally.
    setWarehouseInput(committedWarehouseName)
  }, [committedWarehouseName])

  // Cleanup blur timer on unmount
  React.useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  const warehouseSuggestions = React.useMemo(() => {
    const term = warehouseInput.trim().toLowerCase()

    // Merge warehouse list with live stock data
    const withStock: CreateLookupOption[] = warehouses.map((w) => {
      const stockItem = Array.isArray(stocks) ? stocks.find((s: any) => s.code === w.code) : null
      const stockQty = typeof stockItem?.stock === 'number' ? stockItem.stock : undefined
      return {
        ...w,
        stock: stockQty,
        disabled: stockQty !== undefined && stockQty < minStockToSelectWarehouse,
      }
    })

    // Filter by search term
    const filtered = term
      ? withStock.filter(
          (w) => w.name.toLowerCase().includes(term) || w.code.toLowerCase().includes(term),
        )
      : withStock

    const score = (item: CreateLookupOption) => {
      if (!term) return 3
      const code = item.code.toLowerCase()
      const name = item.name.toLowerCase()
      if (code === term || name === term) return 0
      if (code.startsWith(term) || name.startsWith(term)) return 1
      if (code.includes(term) || name.includes(term)) return 2
      return 3
    }

    // Buyer-style search ranking first, stock as secondary sort.
    return [...filtered].sort((a, b) => {
      const byScore = score(a) - score(b)
      if (byScore !== 0) return byScore
      const aStock = a.stock ?? -1
      const bStock = b.stock ?? -1
      const byStock = bStock - aStock
      if (byStock !== 0) return byStock
      return a.code.localeCompare(b.code, undefined, { sensitivity: 'base', numeric: true })
    })
  }, [warehouses, stocks, warehouseInput, minStockToSelectWarehouse])

  const handleWarehouseFocus = () => {
    if (disableInputs) return
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    syncDropdownPosition()
    setWarehouseFocused(true)
    // Do NOT clear the input on focus. Keep the current value so suggestions
    // filter by it immediately — matching the sales employee  pattern exactly.
  }

  const handleWarehouseBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setWarehouseFocused(false)
      setDropdownStyle(null)
    }, 150)
  }

  // --- Warehouse input: two-way sync matching the sales-employee lookup pattern ---

  const findWarehouseByName = (value: string) =>
    warehouses.find((w) => w.name.toLowerCase() === value.trim().toLowerCase())

  const findWarehouseByCode = (value: string) =>
    warehouses.find((w) => w.code.toLowerCase() === value.trim().toLowerCase())

  const selectWarehouseInRow = (item: CreateLookupOption) => {
    setWarehouseInput(item.name)
    setWarehouseFocused(false)
    handleSelectWarehouse(item)
  }

  const handleWarehouseChange = (value: string) => {
    setWarehouseInput(value)
    if (value.trim() === '') {
      setWarehouseFocused(true)
      if (row.warehouseCode || row.stock !== 0) {
        updateProductRow(row.id, { warehouseCode: '', stock: 0 })
      }
      return
    }
    // Auto-commit on exact name or code match (same as sales employee)
    const matched = findWarehouseByName(value) ?? findWarehouseByCode(value)
    if (matched) {
      selectWarehouseInRow(matched)
      return
    }
    // Keep draft typing visible but clear committed warehouse/stock to avoid stale badge/values.
    if (row.warehouseCode || row.stock !== 0) {
      updateProductRow(row.id, { warehouseCode: '', stock: 0 })
    }
    setWarehouseFocused(true)
  }
  const handleSelectWarehouse = (item: CreateLookupOption) => {
    setWarehouseInput(item.name)
    updateProductRow(row.id, { warehouseCode: item.code })
  }

  // Reactive stock synchronization:
  // When the warehouse code changes or the underlying stock data is refreshed,
  // update the row's stock value to keep the badge and validation in sync.
  React.useEffect(() => {
    if (!row.productCode || !row.warehouseCode || !stocksQuery.data) return
    const matched = stocksQuery.data.find(
      (s: any) => String(s.code).trim() === String(row.warehouseCode).trim(),
    )
    const newStock = Number(matched?.stock ?? 0)
    if (row.stock !== newStock) {
      updateProductRow(row.id, { stock: newStock })
    }
  }, [stocksQuery.data, row.warehouseCode, row.productCode, row.id, row.stock, updateProductRow])

  const maxAllowed = Math.max(0, Math.floor(row.stock) - stockLimitReserve)

  const quantityMessage =
    row.stock > 0 ? (
      <span className="flex items-center gap-1.5">
        <span className="font-normal text-zinc-600">Max allowed limit: </span>
        <span className="font-bold text-blue-600">{maxAllowed}</span>
      </span>
    ) : (
      <span className="font-bold text-rose-500">Item is out of stock</span>
    )
  const grossAmount = row.price * (row.quantity || 0)
  const clampedDiscountPercent = Math.max(0, Math.min(100, row.discountPercent))
  const derivedDiscountAmountFromPercent = (grossAmount * clampedDiscountPercent) / 100
  const persistedDiscountAmount =
    row.discountAmount > 0 ? row.discountAmount : derivedDiscountAmountFromPercent
  const clampedDiscountAmount = Math.max(0, Math.min(grossAmount, persistedDiscountAmount))
  const lineNetTotal = grossAmount - clampedDiscountAmount
  const unitNetPrice = (row.quantity || 0) > 0 ? lineNetTotal / (row.quantity || 1) : 0

  const discountPercentInputValue =
    rowDraft?.discountPercent ??
    (clampedDiscountPercent === 0 ? '' : String(clampedDiscountPercent))
  const discountAmountInputValue =
    rowDraft?.discountAmount ?? (clampedDiscountAmount === 0 ? '' : String(clampedDiscountAmount))

  return (
    <tr>
      <td className="min-w-0 px-2 py-2">
        <div className="space-y-1">
          <Tooltip
            content={row.productName || 'Select Product'}
            className="block w-full max-w-full"
          >
            <button
              type="button"
              disabled={disableInputs}
              onClick={() => {
                if (disableInputs) {
                  onInputRestrictedClick?.()
                  return
                }
                openProductPopup(row.id)
              }}
              onMouseEnter={prefetchProducts}
              onFocus={prefetchProducts}
              className={`block w-full truncate text-left text-sm text-zinc-800 transition ${
                disableInputs ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:text-zinc-950'
              }`}
            >
              {row.productName || 'Select Product'}
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
            readOnly={disableInputs}
            onChange={(e) => handleWarehouseChange(e.target.value)}
            onFocus={handleWarehouseFocus}
            onBlur={handleWarehouseBlur}
            onClick={() => {
              if (disableInputs) onInputRestrictedClick?.()
            }}
            disabled={warehousesLoading}
            placeholder={warehousesLoading ? 'Loading...' : 'Select Warehouse'}
            className={`h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${
              disableInputs ? 'cursor-not-allowed opacity-70' : 'cursor-text'
            } ${row.warehouseCode ? 'pr-[4.5rem]' : 'pr-10'}`}
          />
          {row.warehouseCode && (
            <div className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2">
              <span
                className={`flex h-5 items-center justify-center rounded px-1.5 text-[10px] font-bold ${
                  row.stock > 0
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                }`}
              >
                {row.stock}
              </span>
            </div>
          )}
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
              const liveValue = warehouseInputRef.current?.value ?? warehouseInput
              setWarehouseLookupInitialSearch(liveValue)
              setWarehouseFocused(false)
              setLookupOpen(true)
            }}
            className={`absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition ${
              disableInputs ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-zinc-100'
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
                    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
                    selectWarehouseInRow(item)
                  }}
                  containerClassName="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
                  showStock
                  query={warehouseInput}
                />
              </div>,
              document.body,
            )}
        </div>

        <ProductWarehouseStockModal
          open={lookupOpen}
          product={{ code: row.productCode, name: row.productName }}
          stocks={stocks}
          loading={stocksQuery.isLoading}
          error={stocksQuery.isError ? 'Unable to load stocks' : null}
          onClose={() => setLookupOpen(false)}
          minSelectableStock={minStockToSelectWarehouse}
          initialSearch={warehouseLookupInitialSearch}
          onSearchChange={(value) => {
            setWarehouseLookupInitialSearch(value)
            setWarehouseInput(value)
          }}
          onSelect={(item) => {
            handleSelectWarehouse(item)
            setLookupOpen(false)
          }}
        />
      </td>
      <td className="min-w-0 px-2 py-2">
        {enforceStockLimit ? (
          <Tooltip content={quantityMessage} className="block w-auto max-w-none">
            <input
              type="number"
              min={1}
              step={1}
              value={
                rowDraft?.quantity !== undefined
                  ? rowDraft.quantity
                  : row.quantity === 0
                    ? ''
                    : String(row.quantity)
              }
              readOnly={disableInputs}
              onClick={() => {
                if (disableInputs) onInputRestrictedClick?.()
              }}
              onChange={(event) => {
                if (disableInputs) return
                setProductRowDraft(row.id, 'quantity', event.target.value)
              }}
              onBlur={(event) => {
                if (disableInputs) return
                const rawValue = event.target.value.trim()

                if (rawValue === '') {
                  updateProductRow(row.id, { quantity: 0 })
                  clearProductRowDraft(row.id, 'quantity')
                  return
                }

                const typedQuantity = Math.max(1, Number(rawValue) || 1)
                const clamped = Math.min(maxAllowed, typedQuantity)

                updateProductRow(row.id, { quantity: clamped })
                clearProductRowDraft(row.id, 'quantity')
              }}
              className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-left text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
            />
          </Tooltip>
        ) : (
          <input
            type="number"
            min={1}
            step={1}
            value={
              rowDraft?.quantity !== undefined
                ? rowDraft.quantity
                : row.quantity === 0
                  ? ''
                  : String(row.quantity)
            }
            readOnly={disableInputs}
            onClick={() => {
              if (disableInputs) onInputRestrictedClick?.()
            }}
            onChange={(event) => {
              if (disableInputs) return
              setProductRowDraft(row.id, 'quantity', event.target.value)
            }}
            onBlur={(event) => {
              if (disableInputs) return
              const rawValue = event.target.value.trim()

              if (rawValue === '') {
                updateProductRow(row.id, { quantity: 0 })
                clearProductRowDraft(row.id, 'quantity')
                return
              }

              const typedQuantity = Math.max(1, Number(rawValue) || 1)
              updateProductRow(row.id, { quantity: typedQuantity })
              clearProductRowDraft(row.id, 'quantity')
            }}
            className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-left text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
          />
        )}
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm text-zinc-700">
        {row.price.toFixed(2)}
      </td>
      <td className="min-w-0 px-2 py-2">
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={discountPercentInputValue}
          readOnly={disableInputs}
          onClick={() => {
            if (disableInputs) onInputRestrictedClick?.()
          }}
          onChange={(event) => {
            if (disableInputs) return
            const rawValue = event.target.value
            setProductRowDraft(row.id, 'discountPercent', rawValue)

            const trimmedValue = rawValue.trim()
            if (trimmedValue === '') {
              updateProductRow(row.id, {
                discountPercent: 0,
                discountAmount: 0,
              })
              return
            }

            const nextPercent = Math.max(0, Number(trimmedValue) || 0)
            const nextAmount = (grossAmount * nextPercent) / 100
            updateProductRow(row.id, {
              discountPercent: nextPercent,
              discountAmount: Math.max(0, Math.min(grossAmount, nextAmount)),
            })
          }}
          onBlur={(event) => {
            if (disableInputs) return
            const rawValue = event.target.value.trim()
            const nextPercent = rawValue === '' ? 0 : Math.max(0, Number(rawValue) || 0)
            const nextAmount = (grossAmount * nextPercent) / 100
            updateProductRow(row.id, {
              discountPercent: nextPercent,
              discountAmount: Math.max(0, Math.min(grossAmount, nextAmount)),
            })
            clearProductRowDraft(row.id, 'discountPercent')
          }}
          className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
        />
      </td>
      <td className="min-w-0 px-2 py-2">
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          max={grossAmount}
          title=""
          value={discountAmountInputValue}
          readOnly={disableInputs}
          onClick={() => {
            if (disableInputs) onInputRestrictedClick?.()
          }}
          onChange={(event) => {
            if (disableInputs) return
            const rawValue = event.target.value
            setProductRowDraft(row.id, 'discountAmount', rawValue)

            const trimmedValue = rawValue.trim()
            if (trimmedValue === '') {
              updateProductRow(row.id, {
                discountAmount: 0,
                discountPercent: 0,
              })
              return
            }

            const nextAmount = Math.max(0, Number(trimmedValue) || 0)
            const safeAmount = Math.min(grossAmount, nextAmount)
            const nextPercent = grossAmount > 0 ? (safeAmount / grossAmount) * 100 : 0
            updateProductRow(row.id, {
              discountAmount: safeAmount,
              discountPercent: nextPercent,
            })
          }}
          onBlur={(event) => {
            if (disableInputs) return
            const rawValue = event.target.value.trim()
            const nextAmount = rawValue === '' ? 0 : Math.max(0, Number(rawValue) || 0)
            const safeAmount = Math.min(grossAmount, nextAmount)
            const nextPercent = grossAmount > 0 ? (safeAmount / grossAmount) * 100 : 0
            updateProductRow(row.id, {
              discountAmount: safeAmount,
              discountPercent: nextPercent,
            })
            clearProductRowDraft(row.id, 'discountAmount')
          }}
          className={`h-9 w-full min-w-0 rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
        />
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm text-zinc-700">
        {unitNetPrice.toFixed(2)}
      </td>
      <td className="whitespace-nowrap min-w-0 px-2 py-2 text-left text-sm font-medium text-zinc-900">
        {lineNetTotal.toFixed(2)}
      </td>
      <td className="min-w-0 px-2 py-2">
        <Tooltip content="Remove row" className="block w-auto max-w-none">
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => {
              if (disableInputs) {
                onInputRestrictedClick?.()
                return
              }
              removeProductRow(row.id)
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition ${
              disableInputs ? 'cursor-not-allowed bg-zinc-50 opacity-40' : 'cursor-pointer bg-white hover:bg-zinc-50 hover:text-blue-600'
            }`}
            aria-label="Remove product row"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </td>
    </tr>
  )
}
