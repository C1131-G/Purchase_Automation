import { type QueryClient } from '@tanstack/react-query'

import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'

const PRODUCT_LOOKUP_LIMIT = 100

const normalizeCodeForCompare = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
}

export const resolveProductTaxRates = async (queryClient: QueryClient, itemCodes: string[]) => {
  const taxRateByItemCode = new Map<string, number>()
  const uniqueItemCodes = [...new Set(itemCodes.map((code) => String(code ?? '').trim()))].filter(Boolean)

  await Promise.all(
    uniqueItemCodes.map(async (itemCode) => {
      const products = (await queryClient
        .fetchQuery(createSharedQueries.products(undefined, itemCode, PRODUCT_LOOKUP_LIMIT))
        .catch(() => [])) as ProductLookupItem[]

      const matchedProduct =
        products.find(
          (product) =>
            normalizeCodeForCompare(product.code) === normalizeCodeForCompare(itemCode),
        ) ?? products[0]

      if (!matchedProduct) return

      const taxRate = Number(matchedProduct.taxRate ?? 0)
      taxRateByItemCode.set(itemCode, Number.isFinite(taxRate) ? taxRate : 0)
    }),
  )

  return taxRateByItemCode
}
