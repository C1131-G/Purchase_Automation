import { useMemo } from 'react'

import {
  type LookupItem,
  type ProductLookupItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'

interface UseAPCreditMemoLookupsProps {
  vendors: LookupItem[]
  warehouses: LookupItem[]
  buyers: LookupItem[]
  vendorNameInput: string
  vendorCodeInput: string
  warehouseInput: string
  buyerInput: string
}

export function useAPCreditMemoLookups({
  vendors,
  warehouses,
  buyers,
  vendorNameInput,
  vendorCodeInput,
  warehouseInput,
  buyerInput,
}: UseAPCreditMemoLookupsProps) {
  const rankLookupOptions = (items: ProductLookupItem[], rawSearch: string) => {
    const term = rawSearch.trim().toLowerCase()
    if (!term) return items

    const score = (item: ProductLookupItem) => {
      const code = item.code.toLowerCase()
      const name = item.name.toLowerCase()
      if (code === term || name === term) return 0
      if (code.startsWith(term) || name.startsWith(term)) return 1
      if (code.includes(term) || name.includes(term)) return 2
      return 3
    }

    return [...items].sort((a, b) => {
      const byScore = score(a) - score(b)
      if (byScore !== 0) return byScore
      return a.code.localeCompare(b.code, undefined, { sensitivity: 'base', numeric: true })
    })
  }

  const limitInlineSuggestions = (items: ProductLookupItem[]) => items

  const vendorNameSuggestions = useMemo(
    () =>
      limitInlineSuggestions(rankLookupOptions(vendors as ProductLookupItem[], vendorNameInput)),
    [vendorNameInput, vendors],
  )
  const vendorCodeSuggestions = useMemo(
    () =>
      limitInlineSuggestions(rankLookupOptions(vendors as ProductLookupItem[], vendorCodeInput)),
    [vendorCodeInput, vendors],
  )
  const warehouseSuggestions = useMemo(
    () =>
      limitInlineSuggestions(rankLookupOptions(warehouses as ProductLookupItem[], warehouseInput)),
    [warehouseInput, warehouses],
  )
  const buyerSuggestions = useMemo(
    () => limitInlineSuggestions(rankLookupOptions(buyers as ProductLookupItem[], buyerInput)),
    [buyerInput, buyers],
  )

  return {
    vendorNameSuggestions,
    vendorCodeSuggestions,
    warehouseSuggestions,
    buyerSuggestions,
  }
}
