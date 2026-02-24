import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'

// CreateProductTableRow: Specialized line item editor with real-time tax/total calculation.
import { Tooltip } from '@/components/tooltip'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import {
  type ProductRow,
  type ProductRowDraft,
  type StockPreviewProduct,
} from '@/features/create-pages/create-shared/utils/create-order.types'

interface CreateProductTableRowProps {
  row: ProductRow
  rowDraft?: ProductRowDraft | undefined
  effectiveWarehouseCode: string
  enforceStockLimit?: boolean
  openProductPopup: (rowId: string | null) => void
  openStockPreview: (product: StockPreviewProduct) => void
  updateProductRow: (id: string, patch: Partial<ProductRow>) => void
  removeProductRow: (id: string) => void
  setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => void
  clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => void
  prefetchProducts: () => void
  disableInputs?: boolean
  onInputRestrictedClick?: () => void
}

export function CreateProductTableRow({
  row,
  rowDraft,
  effectiveWarehouseCode,
  enforceStockLimit = true,
  openProductPopup,
  openStockPreview,
  updateProductRow,
  removeProductRow,
  setProductRowDraft,
  clearProductRowDraft,
  prefetchProducts,
  disableInputs = false,
  onInputRestrictedClick,
}: CreateProductTableRowProps) {
  const queryClient = useQueryClient()

  const maxAllowed = Math.max(1, Math.floor(row.stock) - 1)
  const isNearLimit = enforceStockLimit && row.quantity >= maxAllowed
  const quantityMessage =
    row.stock > 0 ? `Max allowed limit: ${maxAllowed}` : 'Max allowed limit unavailable'
  const grossAmount = row.price * row.quantity
  const clampedDiscountPercent = Math.max(0, Math.min(100, row.discountPercent))
  const derivedDiscountAmountFromPercent = (grossAmount * clampedDiscountPercent) / 100
  const persistedDiscountAmount =
    row.discountAmount > 0 ? row.discountAmount : derivedDiscountAmountFromPercent
  const clampedDiscountAmount = Math.max(0, Math.min(grossAmount, persistedDiscountAmount))
  const lineNetTotal = grossAmount - clampedDiscountAmount
  const unitNetPrice = row.quantity > 0 ? lineNetTotal / row.quantity : 0

  const discountPercentInputValue =
    rowDraft?.discountPercent ??
    (clampedDiscountPercent === 0 ? '' : String(clampedDiscountPercent))
  const discountAmountInputValue =
    rowDraft?.discountAmount ?? (clampedDiscountAmount === 0 ? '' : String(clampedDiscountAmount))

  return (
    <tr>
      <td className="w-sm max-w-sm px-3 py-2">
        <div className="space-y-1">
          <Tooltip
            content={row.productName || 'Select Product'}
            className="block w-full max-w-full"
          >
            <button
              type="button"
              onClick={() => openProductPopup(row.id)}
              onMouseEnter={prefetchProducts}
              onFocus={prefetchProducts}
              className="block w-full cursor-pointer truncate text-left text-sm text-zinc-800 hover:text-zinc-950"
            >
              {row.productName || 'Select Product'}
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={() =>
              openStockPreview({
                code: row.productCode,
                name: row.productName || row.productCode,
              })
            }
            onMouseEnter={() =>
              void queryClient.prefetchQuery(
                createSharedQueries.productWarehouseStocks(row.productCode),
              )
            }
            onFocus={() =>
              void queryClient.prefetchQuery(
                createSharedQueries.productWarehouseStocks(row.productCode),
              )
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <span className="truncate">{`Warehouse: ${effectiveWarehouseCode || '-'}`}</span>
            <span>{`Stock: ${row.stock}`}</span>
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        {enforceStockLimit ? (
          <Tooltip content={quantityMessage} className="block w-auto max-w-none">
            <input
              type="number"
              min={1}
              step={1}
              value={rowDraft?.quantity ?? String(row.quantity)}
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
                const typedQuantity = rawValue === '' ? 1 : Math.max(1, Number(rawValue) || 1)
                updateProductRow(row.id, {
                  quantity: Math.min(maxAllowed, typedQuantity),
                })
                clearProductRowDraft(row.id, 'quantity')
              }}
              className={`h-9 w-24 rounded-lg border px-2 text-sm outline-none focus:bg-white ${
                isNearLimit
                  ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-blue-400'
              } ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
            />
          </Tooltip>
        ) : (
          <input
            type="number"
            min={1}
            step={1}
            value={rowDraft?.quantity ?? String(row.quantity)}
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
              const typedQuantity = rawValue === '' ? 1 : Math.max(1, Number(rawValue) || 1)
              updateProductRow(row.id, { quantity: typedQuantity })
              clearProductRowDraft(row.id, 'quantity')
            }}
            className={`h-9 w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-800 outline-none focus:border-blue-400 focus:bg-white ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
          />
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-zinc-700">{row.price.toFixed(2)}</td>
      <td className="px-3 py-2">
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
          className={`h-9 w-20 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-800 outline-none focus:border-blue-400 focus:bg-white ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
        />
      </td>
      <td className="px-3 py-2">
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
          className={`h-9 w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-800 outline-none focus:border-blue-400 focus:bg-white ${disableInputs ? 'cursor-not-allowed opacity-70' : ''}`}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-zinc-700">
        {unitNetPrice.toFixed(2)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-zinc-900">
        {lineNetTotal.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right">
        <Tooltip content="Remove row" className="block w-auto max-w-none">
          <button
            type="button"
            onClick={() => removeProductRow(row.id)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50"
            aria-label="Remove product row"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </td>
    </tr>
  )
}
