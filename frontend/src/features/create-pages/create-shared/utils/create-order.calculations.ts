import { type ProductRow } from '@/features/create-pages/create-shared/utils/create-order.types'

export const calculateOrderTotals = (productRows: ProductRow[]) => {
  let taxTotal = 0
  let netTotal = 0
  let grandTotal = 0

  for (const row of productRows) {
    const gross = row.price * row.quantity
    const discount = Math.max(0, Math.min(gross, row.discountAmount))
    // Product price is tax-inclusive: derive tax from final line amount.
    const lineTotal = gross - discount
    const taxRate = Math.max(0, row.taxRate ?? 0)
    const lineTax = taxRate > 0 ? lineTotal * (taxRate / (100 + taxRate)) : 0
    const lineNet = lineTotal - lineTax
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

export const calculatePOTotals = calculateOrderTotals

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
