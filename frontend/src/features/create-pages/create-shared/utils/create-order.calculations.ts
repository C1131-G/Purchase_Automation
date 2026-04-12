/** Create Order Calculations: Business logic for computing totals, taxes, and line items. */
import { type ProductRow } from '@/features/create-pages/create-shared/utils/create-order.types'

/** Calculate totals for a single product line with tax-exclusive unit price. */
export const calculateLineTotals = (row: ProductRow) => {
  const gross = row.price * row.quantity
  const discount = Math.max(0, Math.min(gross, row.discountAmount))
  // Net line subtotal (pre-tax)
  const lineNet = gross - discount
  const taxRate = Math.max(0, row.taxRate ?? 0)
  // Tax derived from net subtotal
  const lineTax = taxRate > 0 ? lineNet * (taxRate / 100) : 0
  // Inclusive line total (what SAP uses)
  const lineTotal = lineNet + lineTax

  return {
    gross,
    discount,
    lineNet,
    lineTax,
    lineTotal,
  }
}

export const calculateOrderTotals = (productRows: ProductRow[]) => {
  let taxTotal = 0
  let netTotal = 0
  let grandTotal = 0

  for (const row of productRows) {
    const { lineNet, lineTax, lineTotal } = calculateLineTotals(row)
    taxTotal += lineTax
    netTotal += lineNet
    grandTotal += lineTotal
  }

  return {
    taxTotal,
    netTotal,
    grandTotal,
  }
}

export const calculateSummaryCurrency = (productRows: ProductRow[]) => {
  const currencies = Array.from(
    new Set(
      productRows.map((row) => row.currency.trim()).filter((currency) => currency.length > 0),
    ),
  )
  if (currencies.length === 1) return currencies[0] ?? ''
  if (currencies.length > 1) return 'MULTI'
  return ''
}
